import { createElement } from "lwc";
import CaseWorkbenchActions from "c/caseWorkbenchActions";

describe("c-case-workbench-actions", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("keeps actions disabled until at least one Case is selected", () => {
    const element = createElement("c-case-workbench-actions", {
      is: CaseWorkbenchActions
    });
    element.canSetPriority = true;
    element.canAssignToMe = true;
    document.body.appendChild(element);

    const buttons = element.shadowRoot.querySelectorAll("lightning-button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });

  it("emits the chosen priority as a request to the parent", () => {
    const element = createElement("c-case-workbench-actions", {
      is: CaseWorkbenchActions
    });
    element.canSetPriority = true;
    element.selectedCount = 3;
    const onSetPriority = jest.fn();
    element.addEventListener("setpriority", onSetPriority);
    document.body.appendChild(element);

    element.shadowRoot.querySelectorAll("lightning-button")[0].click();

    expect(onSetPriority).toHaveBeenCalledTimes(1);
    expect(onSetPriority.mock.calls[0][0].detail).toEqual({ priority: "High" });
  });
});
