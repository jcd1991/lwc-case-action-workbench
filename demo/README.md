# Demo walkthrough

The seed script creates three open Cases with unique subjects so repeated runs do not touch earlier demo data. Two start at Medium priority and belong to the signed-in user. The third uses the owner of another open Case when one is available, so **Assign to Me** has a visible owner change to make. It falls back to the signed-in user when no other owner is available.

Run it only in a Developer Edition or sandbox org:

```bash
sf apex run --file demo/seed-workbench-cases.apex --target-org YOUR_ORG_ALIAS
```

Assign `Case_Workbench_User` to the signed-in user, open the **Case Action Workbench** tab, and select **All Open Cases**. Search for `CAW Demo |` to find this run's records.

## Priority flow

1. Select both Cases whose subjects start with `CAW Demo | Priority`.
2. Choose **Set Priority** and review the confirmation text, including the target value and selected count.
3. Confirm the action. The result panel should list both Case numbers and subjects under **Updated**.
4. Clear or change the search to inspect the Cases at High priority.

## Assignment flow

1. Search for `CAW Demo | Assign to Me` and select that Case.
2. Choose **Assign to Me** and confirm the selected count.
3. Confirm that the result panel reports the Case under **Updated** and that its owner is the signed-in user.

## Verification record

Verified October 11, 2026. Update this record when the demo is rerun; automated coverage and the browser path are listed separately.

- Local LWC Jest: 7 tests passed across 3 suites.
- ESLint and Prettier: passed.
- Apex `CaseActionWorkbenchControllerTest`: 4 tests passed; controller coverage 88%.
- Developer Edition browser flow: confirmed the two selected priority Cases, saw the confirmation with the selected count, and verified two per-record successes. Confirmed the assignment flow for one Case and saw its per-record success result.
- SOQL readback: demo Cases `00001031` and `00001032` were High priority; Case `00001033` was owned by the signed-in user.

## Cleanup

The script intentionally leaves its Cases in the org so the result can be inspected. When you are ready to remove only this demo data, use the `CAW Demo |` subject prefix and verify the records before deleting them. Do not run a broad Case cleanup.
