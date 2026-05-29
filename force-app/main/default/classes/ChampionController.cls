public with sharing class ChampionController {

    @AuraEnabled(cacheable=true)
    public static ChampionInfo getChampionBySportName(String sportName) {
        List<Sport__c> sports = [SELECT Id FROM Sport__c WHERE Name = :sportName AND Is_Active__c = true LIMIT 1];
        if (sports.isEmpty()) return null;
        return getChampionBySportId(sports[0].Id);
    }

    @AuraEnabled(cacheable=true)
    public static ChampionInfo getChampionBySportId(Id sportId) {
        List<Sport_Event__c> events = [
            SELECT Id, Winner__r.Name, Winner__r.Logo_URL__c, Season__c, League__r.Name
            FROM Sport_Event__c
            WHERE League__r.Sport__c = :sportId
              AND Status__c = 'Completed'
              AND Winner__c != null
            ORDER BY Date_Time__c DESC
            LIMIT 1
        ];

        if (!events.isEmpty()) {
            Sport_Event__c event = events[0];
            return new ChampionInfo(
                event.Winner__r.Name,
                event.Winner__r.Logo_URL__c,
                event.Season__c,
                event.League__r.Name
            );
        }

        List<Team__c> teams = [
            SELECT Id, Name, Logo_URL__c, League__r.Name
            FROM Team__c
            WHERE League__r.Sport__c = :sportId
              AND Is_Active__c = true
        ];

        if (teams.isEmpty()) return null;

        Integer randomIndex = Math.mod(Math.abs(Crypto.getRandomInteger()), teams.size());
        Team__c randomTeam = teams[randomIndex];

        return new ChampionInfo(
            randomTeam.Name,
            randomTeam.Logo_URL__c,
            'Random Pick',
            randomTeam.League__r.Name
        );
    }

    public class ChampionInfo {
        @AuraEnabled public String teamName;
        @AuraEnabled public String teamLogoUrl;
        @AuraEnabled public String season;
        @AuraEnabled public String leagueName;

        public ChampionInfo(String teamName, String teamLogoUrl, String season, String leagueName) {
            this.teamName = teamName;
            this.teamLogoUrl = teamLogoUrl;
            this.season = season;
            this.leagueName = leagueName;
        }
    }
}