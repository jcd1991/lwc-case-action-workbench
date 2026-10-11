# LWC Case Action Workbench

A Salesforce DX portfolio project for reviewing open Cases and applying guarded bulk actions from a purpose-built Lightning page.

## The admin problem

Admins and service teams often need to select Cases and apply the same action to several records. Standard list-view actions do not provide a supported general-purpose route for launching an LWC with a multi-record selection. This project gives users a dedicated Lightning workbench with explicit selection, server-side authorization, and per-record results.

This is **not** a native list-view or related-list button. The workbench owns its selection on a Lightning App Page so it does not rely on an unsupported URL-button handoff.

## Features

- View open Cases owned by the current user or all Cases the user can access.
- Filter by common open Case statuses and search by subject.
- Select Cases across cursor-paginated pages, with a 200-record cap.
- Bulk set priority or assign Cases to the current user.
- Preserve failed rows for retry and display record-level errors after partial success.
- Read through the GraphQL wire adapter and Lightning Data Service cache; use user-mode Apex for bulk writes.
- Enforce custom permissions in Apex as well as hiding unavailable actions in the UI.

## Architecture

```text
caseWorkbench
  ├── caseWorkbenchFilters  → scope, status, and subject filters
  ├── lightning-datatable   → cursor page and explicit selection
  └── caseWorkbenchActions  → bulk action requests

GraphQL wire (LDS/UI API) → Case rows
caseWorkbenchActions → with-sharing Apex → user-mode query and partial DML
                         └→ per-record outcomes → refresh GraphQL + notify LDS
```

Child components report user intent with custom events; the parent owns query, selection, pagination, and action state. Salesforce base components provide the standard interaction and accessibility behavior.

## Security

`CaseActionWorkbenchController` declares `with sharing`, uses `WITH USER_MODE` for its query, uses user-mode partial DML, re-queries submitted IDs, caps the request at 200 records, and validates priority values against the Case picklist. Apex checks `Can_Bulk_Set_Case_Priority` or `Can_Assign_Cases_To_Self` on every call. UI checks are only a convenience and are not the security boundary.

Assign the `Case_Workbench_User` permission set to each intended user. The user's profile and sharing rules still determine which Cases are visible and editable.

## Setup

Requirements: Salesforce CLI, Node.js, and a Salesforce Developer or sandbox org.

```bash
sf org login web --alias workbench-dev --instance-url https://login.salesforce.com
sf project deploy start --target-org workbench-dev
sf org assign permset --name Case_Workbench_User --target-org workbench-dev
```

Open **Case Action Workbench** from the App Launcher, then choose the **Case Action Workbench** navigation tab. The tab route is `/lightning/n/Case_Action_Workbench` after the app is active.

For a clean demo, create a few Cases owned by the current user and leave them in an open status. The component does not create demo records.

## Development

```bash
npm install
npm test
npm run lint
sf apex run test --target-org workbench-dev --test-level RunLocalTests
```

Deploy after local checks:

```bash
sf project deploy start --target-org workbench-dev
```

## Verification

Deployed and exercised in a Salesforce Developer Edition org on 2026-10-11. The LWC Jest suite passed (2 suites, 3 tests), ESLint and Prettier checks passed, and `CaseActionWorkbenchControllerTest` passed in the org (3 tests; 84% controller coverage). In the browser, the Priority demo Case was changed from Medium to High, and the Assignment demo Case was reassigned from another active org user to the signed-in user. Both actions showed Salesforce's successful one-Case update toast; a follow-up SOQL read confirmed the persisted values.

## Known limits

- The page demonstrates bulk actions in a dedicated Lightning App Page. It does not add an LWC to standard list-view buttons or related-list buttons.
- The initial status filter includes New, Working, and Escalated. Orgs with different Case status values should adapt the filter choices to their configured picklist.
- The workbench displays one GraphQL cursor page at a time and keeps the explicit selection between pages, up to 200 selected Cases.
- Bulk updates use partial success. A successful row is removed from the selection; a failed row remains selected with its error for correction or retry.

## References

- [Salesforce LWC data guidelines](https://developer.salesforce.com/docs/platform/lwc/guide/data-guidelines.html)
- [GraphQL wire adapter](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-use.html)
- [GraphQL pagination and refresh](https://developer.salesforce.com/docs/platform/graphql/guide/graphql-wire-lwc-paginate.html)
- [Secure Apex classes](https://developer.salesforce.com/docs/platform/lwc/guide/apex-security)
- [Apex Hours: Lightning Web Components best practices, Part 2](https://www.apexhours.com/lightning-web-components-lwc-part-2/)
