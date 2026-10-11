public with sharing class CaseActionWorkbenchController {
  private static final Integer MAX_RECORDS = 200;

  public class ActionOutcome {
    @AuraEnabled
    public Id recordId { get; set; }
    @AuraEnabled
    public Boolean success { get; set; }
    @AuraEnabled
    public String message { get; set; }

    public ActionOutcome(Id recordId, Boolean success, String message) {
      this.recordId = recordId;
      this.success = success;
      this.message = message;
    }
  }

  @AuraEnabled
  public static List<ActionOutcome> setPriority(
    List<Id> caseIds,
    String priority
  ) {
    requirePermission('Can_Bulk_Set_Case_Priority');
    if (String.isBlank(priority) || !isValidPriority(priority)) {
      throw new AuraHandledException('Choose an active Case priority.');
    }
    return updateCases(caseIds, new CaseChange('Priority', priority));
  }

  @AuraEnabled
  public static List<ActionOutcome> assignToMe(List<Id> caseIds) {
    requirePermission('Can_Assign_Cases_To_Self');
    return updateCases(
      caseIds,
      new CaseChange('OwnerId', UserInfo.getUserId())
    );
  }

  private class CaseChange {
    String fieldName;
    Object value;

    CaseChange(String fieldName, Object value) {
      this.fieldName = fieldName;
      this.value = value;
    }
  }

  private static void requirePermission(String permissionName) {
    if (!FeatureManagement.checkPermission(permissionName)) {
      throw new AuraHandledException(
        'You do not have permission to perform this action.'
      );
    }
  }

  private static Boolean isValidPriority(String requestedPriority) {
    for (
      Schema.PicklistEntry option : Case.Priority.getDescribe()
        .getPicklistValues()
    ) {
      if (option.isActive() && option.getValue() == requestedPriority) {
        return true;
      }
    }
    return false;
  }

  private static List<ActionOutcome> updateCases(
    List<Id> caseIds,
    CaseChange change
  ) {
    List<ActionOutcome> outcomes = new List<ActionOutcome>();
    if (caseIds == null || caseIds.isEmpty()) {
      throw new AuraHandledException('Select at least one Case.');
    }
    if (caseIds.size() > MAX_RECORDS) {
      throw new AuraHandledException(
        'Select no more than 200 Cases at a time.'
      );
    }

    Set<Id> requestedIds = new Set<Id>(caseIds);
    Map<Id, Case> visibleCases = new Map<Id, Case>(
      [
        SELECT Id
        FROM Case
        WHERE Id IN :requestedIds
        WITH USER_MODE
      ]
    );

    List<Case> changes = new List<Case>();
    List<Id> attemptedIds = new List<Id>();
    for (Id recordId : requestedIds) {
      if (!visibleCases.containsKey(recordId)) {
        outcomes.add(
          new ActionOutcome(
            recordId,
            false,
            'Case is unavailable or you do not have access.'
          )
        );
        continue;
      }
      Case updateRecord = new Case(Id = recordId);
      updateRecord.put(change.fieldName, change.value);
      changes.add(updateRecord);
      attemptedIds.add(recordId);
    }

    if (!changes.isEmpty()) {
      Database.SaveResult[] results = Database.update(
        changes,
        false,
        AccessLevel.USER_MODE
      );
      for (Integer index = 0; index < results.size(); index++) {
        Database.SaveResult result = results[index];
        if (result.isSuccess()) {
          outcomes.add(new ActionOutcome(attemptedIds[index], true, null));
        } else {
          outcomes.add(
            new ActionOutcome(
              attemptedIds[index],
              false,
              result.getErrors()[0].getMessage()
            )
          );
        }
      }
    }
    return outcomes;
  }
}
