global class BirthdayPerksSchedulable implements Schedulable {
    global void execute(SchedulableContext ctx) {
        BirthdayPerksService.grantBirthdayBonuses();
    }
}