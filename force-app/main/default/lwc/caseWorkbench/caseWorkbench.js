import { LightningElement, wire } from "lwc";
import { gql, graphql } from "lightning/graphql";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { notifyRecordUpdateAvailable } from "lightning/uiRecordApi";
import setPriority from "@salesforce/apex/CaseActionWorkbenchController.setPriority";
import assignToMe from "@salesforce/apex/CaseActionWorkbenchController.assignToMe";
import userId from "@salesforce/user/Id";
import canSetPriorityPermission from "@salesforce/customPermission/Can_Bulk_Set_Case_Priority";
import canAssignToMePermission from "@salesforce/customPermission/Can_Assign_Cases_To_Self";

const PAGE_SIZE = 50;
const SELECTION_LIMIT = 200;
const COLUMNS = [
  { label: "Case Number", fieldName: "CaseNumber", type: "text" },
  { label: "Subject", fieldName: "Subject", type: "text", wrapText: true },
  { label: "Status", fieldName: "Status", type: "text" },
  { label: "Priority", fieldName: "Priority", type: "text" },
  { label: "Created", fieldName: "CreatedDate", type: "text" }
];

const CASES_QUERY = gql`
  query OpenCases($first: Int!, $after: String, $where: Case_Filter) {
    uiapi {
      query {
        Case(
          first: $first
          after: $after
          where: $where
          orderBy: { CreatedDate: { order: DESC } }
        ) {
          edges {
            node {
              Id
              CaseNumber {
                value
              }
              Subject {
                value
              }
              Status {
                value
              }
              Priority {
                value
              }
              CreatedDate {
                displayValue
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

export default class CaseWorkbench extends LightningElement {
  columns = COLUMNS;
  scope = "all";
  status = "all";
  searchTerm = "";
  rows = [];
  pageInfo = { endCursor: null, hasNextPage: false };
  afterCursor = null;
  cursorStack = [];
  selectedRowsById = new Map();
  tableErrors;
  loadError;
  isLoading = true;
  isBusy = false;
  refreshGraphQL;
  canSetPriority = canSetPriorityPermission;
  canAssignToMe = canAssignToMePermission;

  get variables() {
    const where = { IsClosed: { eq: false } };
    if (this.scope === "mine") {
      where.OwnerId = { eq: userId };
    }
    if (this.status !== "all") {
      where.Status = { eq: this.status };
    }
    if (this.searchTerm.trim()) {
      where.Subject = { like: `%${this.searchTerm.trim()}%` };
    }
    return {
      first: PAGE_SIZE,
      after: this.afterCursor,
      where
    };
  }

  @wire(graphql, { query: CASES_QUERY, variables: "$variables" })
  wiredCases(result) {
    this.isLoading = false;
    this.loadError = undefined;
    const { data, errors, refresh } = result;
    if (refresh) {
      this.refreshGraphQL = refresh;
    }
    if (data) {
      const connection = data.uiapi.query.Case;
      this.rows = connection.edges.map(({ node }) => ({
        Id: node.Id,
        CaseNumber: node.CaseNumber?.value,
        Subject: node.Subject?.value,
        Status: node.Status?.value,
        Priority: node.Priority?.value,
        CreatedDate: node.CreatedDate?.displayValue
      }));
      this.pageInfo = connection.pageInfo;
    }
    if (errors?.length) {
      this.rows = [];
      this.loadError = errors.map((error) => error.message).join("; ");
    }
  }

  get selectedCount() {
    return this.selectedRowsById.size;
  }

  get selectedRowIds() {
    return this.rows
      .filter((row) => this.selectedRowsById.has(row.Id))
      .map((row) => row.Id);
  }

  get pageSummary() {
    const count = this.rows.length;
    return count === 0
      ? "No Cases found on this page"
      : `${count} Cases on this page`;
  }

  get isPreviousDisabled() {
    return this.cursorStack.length === 0 || this.isBusy;
  }

  get isNextDisabled() {
    return !this.pageInfo.hasNextPage || this.isBusy;
  }

  handleFilterChange(event) {
    const { scope, status, searchTerm } = event.detail;
    this.scope = scope;
    this.status = status;
    this.searchTerm = searchTerm;
    this.resetPaginationAndSelection();
  }

  handleRowSelection(event) {
    const nextSelection = new Map(this.selectedRowsById);
    this.rows.forEach((row) => nextSelection.delete(row.Id));

    const pageSelection = event.detail.selectedRows;
    const remainingSlots = SELECTION_LIMIT - nextSelection.size;
    pageSelection
      .slice(0, remainingSlots)
      .forEach((row) => nextSelection.set(row.Id, row));
    this.selectedRowsById = nextSelection;
    this.tableErrors = undefined;

    if (pageSelection.length > remainingSlots) {
      this.showToast(
        "Selection limit reached",
        "You can select up to 200 Cases.",
        "warning"
      );
    }
  }

  handleNext() {
    if (this.pageInfo.endCursor && this.pageInfo.hasNextPage) {
      this.cursorStack = [...this.cursorStack, this.afterCursor];
      this.afterCursor = this.pageInfo.endCursor;
    }
  }

  handlePrevious() {
    if (this.cursorStack.length > 0) {
      const nextStack = [...this.cursorStack];
      this.afterCursor = nextStack.pop();
      this.cursorStack = nextStack;
    }
  }

  async handleSetPriority(event) {
    await this.runAction(() =>
      setPriority({
        caseIds: [...this.selectedRowsById.keys()],
        priority: event.detail.priority
      })
    );
  }

  async handleAssignToMe() {
    await this.runAction(() =>
      assignToMe({ caseIds: [...this.selectedRowsById.keys()] })
    );
  }

  async runAction(action) {
    if (this.selectedCount === 0 || this.isBusy) {
      return;
    }
    this.isBusy = true;
    try {
      const outcomes = await action();
      const nextSelection = new Map(this.selectedRowsById);
      const rowErrors = {};
      const updatedIds = [];
      let failures = 0;

      outcomes.forEach((outcome) => {
        if (outcome.success) {
          nextSelection.delete(outcome.recordId);
          updatedIds.push(outcome.recordId);
        } else {
          failures += 1;
          rowErrors[outcome.recordId] = {
            title: "Action failed",
            messages: [outcome.message || "The Case could not be updated."]
          };
        }
      });

      this.selectedRowsById = nextSelection;
      this.tableErrors = Object.keys(rowErrors).length
        ? { rows: rowErrors }
        : undefined;

      let refreshError;
      if (updatedIds.length) {
        try {
          await notifyRecordUpdateAvailable(
            updatedIds.map((recordId) => ({ recordId }))
          );
          await this.refreshGraphQL?.();
        } catch (error) {
          refreshError = this.errorMessage(error);
        }
      }

      let message = failures
        ? `${updatedIds.length} updated; ${failures} need attention. Failed rows remain selected.`
        : `${updatedIds.length} Cases updated.`;
      if (refreshError) {
        message += ` Refresh the page if the rows look out of date (${refreshError}).`;
      }
      this.showToast(
        failures || refreshError ? "Action needs attention" : "Action complete",
        message,
        failures || refreshError ? "warning" : "success"
      );
    } catch (error) {
      this.showToast("Action failed", this.errorMessage(error), "error");
    } finally {
      this.isBusy = false;
    }
  }

  resetPaginationAndSelection() {
    this.afterCursor = null;
    this.cursorStack = [];
    this.selectedRowsById = new Map();
    this.tableErrors = undefined;
  }

  errorMessage(error) {
    return (
      error?.body?.message || error?.message || "An unexpected error occurred."
    );
  }

  showToast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
