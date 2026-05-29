public with sharing class OrderCancellationController {
    @AuraEnabled
    public static void cancelOrder(Id orderId) {
        try {
            if (orderId == null) {
                throw new IllegalArgumentException('Order ID is not provided.');
            }

            Purchase_Order__c order = [
                SELECT Id, Status__c, Sport_Event__c, Loyalty_Points_Used__c, Fan__c
                FROM Purchase_Order__c
                WHERE Id = :orderId
                AND Status__c != 'Cancelled'
                AND Status__c != 'Refunded'
                FOR UPDATE
            ];

            List<Ticket__c> tickets = [
                SELECT Id, Status__c
                FROM Ticket__c
                WHERE Purchase_Order__c = :orderId
            ];
            for (Ticket__c t : tickets) {
                t.Status__c = 'Available';
                t.Purchase_Order__c = null;
                t.Reserved_Until__c = null;
            }
            update tickets;

            if (order.Loyalty_Points_Used__c != null && order.Loyalty_Points_Used__c > 0) {
                restoreRedeemedPoints(order);
            }

            order.Status__c = 'Cancelled';
            update order;

            if (order.Sport_Event__c != null) {
                TicketInventoryService.updateEventAvailabilityStatus(new Set<Id>{order.Sport_Event__c});
            }

        } catch (Exception e) {
            throw new AuraHandledException('Error canceling order: ' + e.getMessage());
        }
    }

    private static void restoreRedeemedPoints(Purchase_Order__c order) {
        Fan__c fan = [
            SELECT Id, Loyalty_Points_Balance__c
            FROM Fan__c
            WHERE Id = :order.Fan__c
            FOR UPDATE
        ];

        Decimal oldBalance = fan.Loyalty_Points_Balance__c;
        fan.Loyalty_Points_Balance__c += order.Loyalty_Points_Used__c;
        update fan;

        Loyalty_Transaction__c lt = new Loyalty_Transaction__c(
            Fan__c = order.Fan__c,
            Type__c = 'Adjustment',
            Reason__c = 'Admin Adjustment',
            Points__c = order.Loyalty_Points_Used__c,
            Transaction_Date__c = Date.today(),
            Purchase_Order__c = order.Id,
            Balance_After__c = fan.Loyalty_Points_Balance__c
        );
        insert lt;
    }
}