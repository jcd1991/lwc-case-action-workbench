import { LightningElement, api } from "lwc";

const SCOPE_OPTIONS = [
  { label: "All open Cases I can access", value: "all" },
  { label: "My open Cases", value: "mine" }
];
const STATUS_OPTIONS = [
  { label: "All open statuses", value: "all" },
  { label: "New", value: "New" },
  { label: "Working", value: "Working" },
  { label: "Escalated", value: "Escalated" }
];

export default class CaseWorkbenchFilters extends LightningElement {
  _scope = "all";
  _status = "all";
  _searchTerm = "";

  @api
  get scope() {
    return this._scope;
  }

  set scope(value) {
    this._scope = value || "all";
  }

  @api
  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value || "all";
  }

  @api
  get searchTerm() {
    return this._searchTerm;
  }

  set searchTerm(value) {
    this._searchTerm = value || "";
  }

  get scopeOptions() {
    return SCOPE_OPTIONS;
  }

  get statusOptions() {
    return STATUS_OPTIONS;
  }

  handleScopeChange(event) {
    this._scope = event.detail.value;
    this.dispatchFilterChange();
  }

  handleStatusChange(event) {
    this._status = event.detail.value;
    this.dispatchFilterChange();
  }

  handleSearchChange(event) {
    this._searchTerm = event.target.value;
    this.dispatchFilterChange();
  }

  handleSearchKeyup(event) {
    if (event.key === "Enter") {
      this._searchTerm = event.target.value;
      this.dispatchFilterChange();
    }
  }

  dispatchFilterChange() {
    this.dispatchEvent(
      new CustomEvent("filterchange", {
        detail: {
          scope: this.scope,
          status: this.status,
          searchTerm: this.searchTerm
        }
      })
    );
  }
}
