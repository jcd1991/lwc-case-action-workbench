@IsTest
private class CaseActionWorkbenchControllerTest {
  @IsTest
  static void requiresPermissionBeforeWriting() {
    User limitedUser = createUser();
    Case sampleCase;
    System.runAs(limitedUser) {
      sampleCase = createCase('Workbench permission test');
      Test.startTest();
      try {
        CaseActionWorkbenchController.setPriority(
          new List<Id>{ sampleCase.Id },
          'High'
        );
        System.assert(false, 'An unassigned user must not perform the action.');
      } catch (AuraHandledException expected) {
        System.assertNotEquals(null, expected);
      }
      Test.stopTest();
    }
  }

  @IsTest
  static void updatesPriorityAndOwnerWithPermissionSet() {
    User workbenchUser = createUser();
    PermissionSet workbenchAccess = [
      SELECT Id
      FROM PermissionSet
      WHERE Name = 'Case_Workbench_User'
      LIMIT 1
    ];
    insert new PermissionSetAssignment(
      AssigneeId = workbenchUser.Id,
      PermissionSetId = workbenchAccess.Id
    );

    System.runAs(workbenchUser) {
      Case priorityCase = createCase('Workbench priority test');
      Case ownerCase = createCase('Workbench owner test');
      Test.startTest();
      List<CaseActionWorkbenchController.ActionOutcome> priorityResults = CaseActionWorkbenchController.setPriority(
        new List<Id>{ priorityCase.Id },
        'High'
      );
      List<CaseActionWorkbenchController.ActionOutcome> ownerResults = CaseActionWorkbenchController.assignToMe(
        new List<Id>{ ownerCase.Id }
      );
      Test.stopTest();

      System.assertEquals(true, priorityResults[0].success);
      System.assertEquals(true, ownerResults[0].success);
      Map<Id, Case> savedCases = new Map<Id, Case>(
        [
          SELECT Id, Priority, OwnerId
          FROM Case
          WHERE Id IN :new Set<Id>{ priorityCase.Id, ownerCase.Id }
        ]
      );
      System.assertEquals('High', savedCases.get(priorityCase.Id).Priority);
      System.assertEquals(
        workbenchUser.Id,
        savedCases.get(ownerCase.Id).OwnerId
      );
    }
  }

  @IsTest
  static void rejectsInvalidPriorityAndOversizedRequest() {
    User workbenchUser = createUser();
    PermissionSet workbenchAccess = [
      SELECT Id
      FROM PermissionSet
      WHERE Name = 'Case_Workbench_User'
      LIMIT 1
    ];
    insert new PermissionSetAssignment(
      AssigneeId = workbenchUser.Id,
      PermissionSetId = workbenchAccess.Id
    );

    System.runAs(workbenchUser) {
      Case sampleCase = createCase('Workbench validation test');
      try {
        CaseActionWorkbenchController.setPriority(
          new List<Id>{ sampleCase.Id },
          'Not a priority'
        );
        System.assert(false, 'An invalid priority must be rejected.');
      } catch (AuraHandledException expected) {
        System.assertNotEquals(null, expected);
      }

      List<Id> tooManyIds = new List<Id>();
      for (Integer index = 0; index < 201; index++) {
        tooManyIds.add(sampleCase.Id);
      }
      try {
        CaseActionWorkbenchController.assignToMe(tooManyIds);
        System.assert(false, 'An oversized request must be rejected.');
      } catch (AuraHandledException expected) {
        System.assertNotEquals(null, expected);
      }
    }
  }

  private static Case createCase(String subject) {
    Case sampleCase = new Case(
      Subject = subject,
      Status = 'New',
      Origin = 'Web'
    );
    insert sampleCase;
    return sampleCase;
  }

  private static User createUser() {
    Profile standardProfile = [
      SELECT Id
      FROM Profile
      WHERE Name = 'Standard User'
      LIMIT 1
    ];
    String uniqueSuffix = String.valueOf(Crypto.getRandomInteger())
      .replace('-', '');
    User testUser = new User(
      Alias = 'cawtest',
      Email = 'case.workbench.' + uniqueSuffix + '@example.invalid',
      EmailEncodingKey = 'UTF-8',
      LastName = 'Workbench Test',
      LanguageLocaleKey = 'en_US',
      LocaleSidKey = 'en_US',
      ProfileId = standardProfile.Id,
      TimeZoneSidKey = 'America/New_York',
      Username = 'case.workbench.' + uniqueSuffix + '@example.invalid'
    );
    insert testUser;
    return testUser;
  }
}
