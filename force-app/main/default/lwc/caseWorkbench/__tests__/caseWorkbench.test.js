import { createElement } from "lwc";
import CaseWorkbench from "c/caseWorkbench";
import LightningConfirm from "lightning/confirm";
import { graphql } from "lightning/graphql";
import { notifyRecordUpdateAvailable } from "lightning/uiRecordApi";
import assignToMe from "@salesforce/apex/CaseActionWorkbenchController.assignToMe";
import setPriority from "@salesforce/apex/CaseActionWorkbenchController.setPriority";

jest.mock(
  "@salesforce/apex/CaseActionWorkbenchController.assignToMe",
  () => ({ default: jest.fn() }),
  { virtual: true }
);
jest.mock(
  "@salesforce/apex/CaseActionWorkbenchController.setPriority",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function makeCase(id, caseNumber, subject) {
  return {
    Id: id,
    CaseNumber: caseNumber,
    Subject: subject,
    Status: "New",
    Priority: "Medium",
    CreatedDate: "Oct 11, 2026"
  };
}

function makeEdge(record) {
  return {
    node: {
      Id: record.Id,
      CaseNumber: { value: record.CaseNumber },
      Subject: { value: record.Subject },
      Status: { value: record.Status },
      Priority: { value: record.Priority },
      CreatedDate: { displayValue: record.CreatedDate }
    }
  };
}

function emitPage(records, pageInfo = { endCursor: null, hasNextPage: false }) {
  graphql.emit({
    uiapi: {
      query: {
        Case: {
          edges: records.map(makeEdge),
          pageInfo
        }
      }
    }
  });
}

function selectRows(element, rows) {
  element.shadowRoot
    .querySelector("lightning-datatable")
    .dispatchEvent(
      new CustomEvent("rowselection", { detail: { selectedRows: rows } })
    );
}

function requestAction(element, eventName, detail) {
  element.shadowRoot
    .querySelector("c-case-workbench-actions")
    .dispatchEvent(new CustomEvent(eventName, { detail }));
}

describe("c-case-workbench", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  beforeEach(() => {
    LightningConfirm.open = jest.fn().mockResolvedValue(true);
    setPriority.mockResolvedValue([]);
    assignToMe.mockResolvedValue([]);
  });

  it("keeps a selected Case when moving to the next GraphQL cursor page", async () => {
    const element = createElement("c-case-workbench", {
      is: CaseWorkbench
    });
    document.body.appendChild(element);

    const firstCase = makeCase("500000000000001", "00001001", "First page");
    emitPage([firstCase], { endCursor: "cursor-1", hasNextPage: true });
    await flushPromises();
    selectRows(element, [firstCase]);

    const nextButton = [
      ...element.shadowRoot.querySelectorAll("lightning-button")
    ].find((button) => button.label === "Next");
    nextButton.click();
    await flushPromises();

    const secondCase = makeCase("500000000000002", "00001002", "Second page");
    emitPage([secondCase]);
    await flushPromises();
    selectRows(element, [secondCase]);

    requestAction(element, "setpriority", { priority: "High" });
    await flushPromises();

    expect(LightningConfirm.open).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Set priority to High for 2 selected Cases?",
        theme: "warning"
      })
    );
    expect(setPriority).toHaveBeenCalledWith({
      caseIds: [firstCase.Id, secondCase.Id],
      priority: "High"
    });
  });

  it("does not call Apex when the user cancels the confirmation", async () => {
    const element = createElement("c-case-workbench", {
      is: CaseWorkbench
    });
    document.body.appendChild(element);

    const selectedCase = makeCase("500000000000003", "00001003", "Keep me");
    emitPage([selectedCase]);
    await flushPromises();
    selectRows(element, [selectedCase]);
    LightningConfirm.open.mockResolvedValue(false);

    requestAction(element, "assigntome");
    await flushPromises();

    expect(LightningConfirm.open).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Assign 1 selected Cases to you?"
      })
    );
    expect(assignToMe).not.toHaveBeenCalled();
    expect(element.shadowRoot.textContent).toContain("1 selected");
  });

  it("shows mixed per-record results and leaves failures selected", async () => {
    const element = createElement("c-case-workbench", {
      is: CaseWorkbench
    });
    document.body.appendChild(element);

    const updatedCase = makeCase("500000000000004", "00001004", "Updated case");
    const failedCase = makeCase("500000000000005", "00001005", "Locked case");
    emitPage([updatedCase, failedCase]);
    await flushPromises();
    selectRows(element, [updatedCase, failedCase]);
    setPriority.mockResolvedValue([
      { recordId: updatedCase.Id, success: true, message: null },
      { recordId: failedCase.Id, success: false, message: "Case is locked." }
    ]);
    const refresh = jest.fn().mockResolvedValue();
    graphql.emit(
      {
        uiapi: {
          query: {
            Case: {
              edges: [makeEdge(updatedCase), makeEdge(failedCase)],
              pageInfo: { endCursor: null, hasNextPage: false }
            }
          }
        }
      },
      undefined,
      refresh
    );
    await flushPromises();

    requestAction(element, "setpriority", { priority: "High" });
    await flushPromises();

    expect(notifyRecordUpdateAvailable).toHaveBeenCalledWith([
      { recordId: updatedCase.Id }
    ]);
    expect(refresh).toHaveBeenCalled();
    const resultPanel = element.shadowRoot.querySelector(
      '[data-testid="action-results"]'
    );
    expect(resultPanel.textContent).toContain("Updated (1)");
    expect(resultPanel.textContent).toContain("00001004 — Updated case");
    expect(resultPanel.textContent).toContain("Needs attention (1)");
    expect(resultPanel.textContent).toContain("00001005 — Locked case");
    expect(resultPanel.textContent).toContain("Case is locked.");
    expect(resultPanel.textContent).toContain("1 Case updated; 1 Case failed.");
    expect(
      element.shadowRoot.querySelector("lightning-datatable").selectedRows
    ).toEqual([failedCase.Id]);
  });

  it("surfaces GraphQL errors as an accessible alert", async () => {
    const element = createElement("c-case-workbench", {
      is: CaseWorkbench
    });
    document.body.appendChild(element);

    graphql.emitErrors([{ message: "Case access is unavailable." }]);
    await flushPromises();

    expect(
      element.shadowRoot.querySelector('[role="alert"]').textContent
    ).toContain("Case access is unavailable.");
  });
});
