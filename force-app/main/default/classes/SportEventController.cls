public with sharing class SportEventController {
    @AuraEnabled(cacheable=true)
    public static List<Sport_Event__c> getEventsBySport(Id sportId) {
        Set<Id> leagueIds = new Map<Id, League__c>(
            [SELECT Id FROM League__c WHERE Sport__c = :sportId]
        ).keySet();
        if (leagueIds.isEmpty()) return new List<Sport_Event__c>();
        
        return [SELECT Id, Name, Date_Time__c, Status__c, 
                       Home_Team__r.Name, Home_Team__r.Logo_URL__c,
                       Away_Team__r.Name, Away_Team__r.Logo_URL__c,
                       Stadium__r.Name, Total_Tickets__c, Tickets_Sold__c
                FROM Sport_Event__c
                WHERE League__c IN :leagueIds
                ORDER BY Date_Time__c ASC
                LIMIT 50];
    }
}