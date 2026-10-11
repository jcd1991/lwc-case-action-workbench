import { createElement } from "lwc";
import CaseWorkbenchFilters from "c/caseWorkbenchFilters";

describe("c-case-workbench-filters", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("emits the updated scope while retaining the other filters", () => {
    const element = createElement("c-case-workbench-filters", {
      is: CaseWorkbenchFilters
    });
    const onFilterChange = jest.fn();
    element.addEventListener("filterchange", onFilterChange);
    document.body.appendChild(element);

    element.shadowRoot
      .querySelector("lightning-combobox")
      .dispatchEvent(new CustomEvent("change", { detail: { value: "mine" } }));

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange.mock.calls[0][0].detail).toEqual({
      scope: "mine",
      status: "all",
      searchTerm: ""
    });
  });
});
