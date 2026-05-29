public with sharing class BirthdayPerksService {
    private static final Integer BONUS_POINTS = 100;

    public static List<Id> grantBirthdayBonuses() {
        Date today = Date.today();
        List<Id> awardedFanIds = new List<Id>();

        List<Fan__c> birthdayFans = [
            SELECT Id, First_Name__c, Last_Name__c, Email__c,
                   Loyalty_Points_Balance__c, Lifetime_Points__c,
                   Last_Birthday_Bonus_Date__c
            FROM Fan__c
            WHERE DAY_IN_MONTH(Date_of_Birth__c) = :today.day()
              AND CALENDAR_MONTH(Date_of_Birth__c) = :today.month()
              AND (Last_Birthday_Bonus_Date__c < THIS_YEAR OR Last_Birthday_Bonus_Date__c = NULL)
        ];

        if (birthdayFans.isEmpty()) return awardedFanIds;

        List<Loyalty_Transaction__c> transactions = new List<Loyalty_Transaction__c>();
        List<Fan__c> fansToUpdate = new List<Fan__c>();

        for (Fan__c fan : birthdayFans) {
            Integer newBalance = (Integer)(fan.Loyalty_Points_Balance__c + BONUS_POINTS);
            Integer newLifetime = (Integer)(fan.Lifetime_Points__c + BONUS_POINTS);

            Loyalty_Transaction__c tx = new Loyalty_Transaction__c(
                Fan__c = fan.Id, Type__c = 'Earned', Points__c = BONUS_POINTS,
                Reason__c = 'Birthday Bonus', Transaction_Date__c = System.now(),
                Balance_After__c = newBalance
            );
            transactions.add(tx);

            fan.Loyalty_Points_Balance__c = newBalance;
            fan.Lifetime_Points__c = newLifetime;
            fan.Last_Birthday_Bonus_Date__c = today;
            fansToUpdate.add(fan);
            awardedFanIds.add(fan.Id);
        }

        insert transactions;
        update fansToUpdate;
        sendBirthdayEmails(birthdayFans);
        return awardedFanIds;
    }

    private static void sendBirthdayEmails(List<Fan__c> fans) {
        EmailTemplate template = [SELECT Id FROM EmailTemplate WHERE DeveloperName = 'Birthday_Bonus' LIMIT 1];
        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();
        for (Fan__c fan : fans) {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setTemplateId(template.Id);
            mail.setTargetObjectId(fan.Id);
            mail.setWhatId(fan.Id);
            mail.setSaveAsActivity(false);
            emails.add(mail);
        }
        if (!emails.isEmpty()) Messaging.sendEmail(emails);
    }
}