public with sharing class LeadController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getLeadCountForProductInterest(String productInterest) {
        Map<String, Object> result = new Map<String, Object>();

        // Query for the lead count by ProductInterest__c and grouped by Status and IsConverted
        List<AggregateResult> leadStats = [
            SELECT ProductInterest__c, 
                   Status, 
                   IsConverted,
                   COUNT(Id) leadCount
            FROM Lead 
            WHERE ProductInterest__c = :productInterest
                  AND (IsConverted = TRUE OR Status IN ('Closed - Not Converted', 'Open - Not Contacted', 'Working - Contacted'))
            GROUP BY ProductInterest__c, Status, IsConverted
        ];

        // Initialize result map with default values
        Map<String, Integer> leadCounts = new Map<String, Integer> {
            'Closed - Not Converted' => 0, 
            'Open - Not Contacted' => 0, 
            'Working - Contacted' => 0,
            'Converted' => 0 // For converted leads
        };

        // Populate the lead count for each status and IsConverted
        for (AggregateResult ar : leadStats) {
            Boolean isConverted = (Boolean) ar.get('IsConverted');
            String status = isConverted ? 'Converted' : (String) ar.get('Status'); // Use 'Converted' for IsConverted leads
            Integer leadCount = ((Decimal) ar.get('leadCount')).intValue(); // Cast to Integer

            // Update the appropriate status count
            leadCounts.put(status, leadCounts.get(status) + leadCount);
        }

        // Add the lead counts to the result map
        result.put('leadCounts', leadCounts);
        return result;
    }
}
