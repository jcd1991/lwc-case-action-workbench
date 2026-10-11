import { LightningElement, api } from "lwc";

const PRIORITY_OPTIONS = [
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" }
];

export default class CaseWorkbenchActions extends LightningElement {
  @api selectedCount = 0;
  @api isBusy = false;
  @api canSetPriority = false;
  @api canAssignToMe = false;
  priority = "High";

  get priorityOptions() {
    return PRIORITY_OPTIONS;
  }

  get isActionDisabled() {
    return this.selectedCount === 0 || this.isBusy;
  }

  get selectionMessage() {
    return this.selectedCount === 1
      ? "1 Case selected"
      : `${this.selectedCount} Cases selected`;
  }

  handlePriorityChange(event) {
    this.priority = event.detail.value;
  }

  handleSetPriority() {
    this.dispatchEvent(
      new CustomEvent("setpriority", { detail: { priority: this.priority } })
    );
  }

  handleAssignToMe() {
    this.dispatchEvent(new CustomEvent("assigntome"));
  }
}
