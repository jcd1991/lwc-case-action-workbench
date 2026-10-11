String runKey = String.valueOf(DateTime.now().getTime());
Id assignmentOwnerId = UserInfo.getUserId();
List<Case> casesWithOtherOwners = [
  SELECT OwnerId
  FROM Case
  WHERE IsClosed = false AND OwnerId != :UserInfo.getUserId()
  ORDER BY CreatedDate DESC
  LIMIT 1
];
if (!casesWithOtherOwners.isEmpty()) {
  assignmentOwnerId = casesWithOtherOwners[0].OwnerId;
}

List<Case> demoCases = new List<Case>{
  new Case(
    Subject = 'CAW Demo | Priority A | ' + runKey,
    Status = 'New',
    Origin = 'Web',
    Priority = 'Medium',
    OwnerId = UserInfo.getUserId()
  ),
  new Case(
    Subject = 'CAW Demo | Priority B | ' + runKey,
    Status = 'New',
    Origin = 'Web',
    Priority = 'Medium',
    OwnerId = UserInfo.getUserId()
  ),
  new Case(
    Subject = 'CAW Demo | Assign to Me | ' + runKey,
    Status = 'New',
    Origin = 'Web',
    Priority = 'Medium',
    OwnerId = assignmentOwnerId
  )
};
insert demoCases;

for (Case demoCase : [
  SELECT Id, CaseNumber, Subject, OwnerId, Priority
  FROM Case
  WHERE Id IN :demoCases
  ORDER BY CaseNumber
]) {
  System.debug(
    'CAW_DEMO_CASE|' +
    demoCase.CaseNumber +
    '|' +
    demoCase.Subject +
    '|owner=' +
    demoCase.OwnerId +
    '|priority=' +
    demoCase.Priority
  );
}
