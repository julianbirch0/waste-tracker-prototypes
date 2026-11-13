/* Agreements front page. No build step, server or external dependencies. */
(function () {
  "use strict";
  const $ = function (id) { return document.getElementById(id); };
  const store = window.AgreementsPrototypeStore;
  const source = window.AgreementPrototypeData;
  const schedule = window.AgreementsPrototypeSchedule;
  const search = $("agreement-search");

  function agreementUrl(id) {
    const url = new URL("index.html", window.location.href);
    if (id) url.searchParams.set("id", id);
    else url.searchParams.set("mode", "new");
    return url.href;
  }

  function cell(row, value, className) {
    const td = document.createElement("td");
    td.textContent = value == null || value === "" ? "—" : String(value);
    if (className) td.className = className;
    row.appendChild(td);
    return td;
  }

  const ACTION_ICONS = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    locked: '<rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ACTION_ICONS[name];
    return svg;
  }

  const DELETE_REASONS = {
    planned: "This agreement has still got planned jobs",
    unexpired: "This agreement has got services that have not reached the end date."
  };

  function deletionBlocker(agreement, planned, today) {
    // Priority: outstanding jobs first, then the service's own lifecycle.
    // A suspended recurring service with an open-ended or future End date
    // still belongs to an active Agreement even if it produces zero jobs.
    if (planned > 0) return "planned";
    const stillActive = (agreement.services || []).some(function (service) {
      if (service.serviceType === "Regular, recurring") {
        return !service.endDate || service.endDate >= today;
      }
      // A one-off date in the future also means its service is unfinished,
      // including when it lies beyond the rolling four-week job horizon.
      if (service.serviceType === "Ad hoc and one-off") {
        return !service.jobDate || service.jobDate >= today;
      }
      return true;
    });
    return stillActive ? "unexpired" : null;
  }

  function showDeleteNotice(agreementId, reason) {
    $("agreement-delete-title").textContent = reason
      ? "Agreement cannot be deleted" : "Delete agreement";
    $("agreement-delete-message").textContent = reason
      ? DELETE_REASONS[reason]
      : "Agreement " + agreementId +
        " has no planned jobs or unexpired services. Deleting agreements is not implemented in this prototype.";
    $("agreement-delete-explanation").hidden = !reason;
    $("agreement-delete-dialog").showModal();
  }

  function render() {
    const agreements = store.load().agreements.slice().sort(function (a, b) {
      return (b.id || "").localeCompare(a.id || "", "en", { numeric: true });
    });
    const term = search.value.trim().toLowerCase();
    const matching = agreements.filter(function (agreement) {
      const customer = store.customerFor(agreement);
      const site = store.siteFor(agreement);
      const searchable = [
        agreement.id, customer && customer.name, site && site.name,
        agreement.containerType, agreement.containerSize,
        agreement.materialType, agreement.material,
        ...(agreement.services || []).map(function (service) { return service.service; })
      ].filter(Boolean).join(" ").toLowerCase();
      return !term || searchable.includes(term);
    });
    const tbody = $("agreements-list-body");
    tbody.replaceChildren();
    $("list-agreement-count").textContent = "(" + agreements.length + ")";
    $("list-result-count").textContent = "Showing " + matching.length + " of " +
      agreements.length + " agreement" + (agreements.length === 1 ? "" : "s");

    if (!matching.length) {
      const row = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "agreements-empty";
      td.textContent = agreements.length ? "No agreements match your search." :
        "No agreements yet. Select Add agreement to get started.";
      row.appendChild(td);
      tbody.appendChild(row);
      return;
    }

    matching.forEach(function (agreement) {
      const customer = store.customerFor(agreement);
      const site = store.siteFor(agreement);
      const row = document.createElement("tr");
      const number = document.createElement("td");
      const link = document.createElement("a");
      link.href = agreementUrl(agreement.id);
      link.className = "agreement-number-link";
      link.textContent = agreement.id || "—";
      number.appendChild(link);
      row.appendChild(number);
      cell(row, customer ? customer.name : "Unknown customer");
      cell(row, site ? site.name : "Unknown site");
      cell(row, [agreement.containerType, agreement.containerSize].filter(Boolean).join(" · "));
      cell(row, [agreement.materialType, agreement.material].filter(Boolean).join(" · "));
      const illustrated = agreement.id === "AGR-10421" ? source.jobs : [];
      const planned = schedule.plannedJobCount(agreement, illustrated);
      const blocker = deletionBlocker(agreement, planned, schedule.isoOfDate(new Date()));
      const plannedCell = cell(row, planned, "agreement-planned-count");
      plannedCell.title = "Next 28 days plus any outstanding overdue jobs";
      const action = document.createElement("td");
      const actions = document.createElement("div");
      actions.className = "agreement-row-actions";
      const edit = document.createElement("a");
      edit.href = agreementUrl(agreement.id);
      edit.className = "agreement-icon-action";
      edit.title = "View / Edit";
      edit.setAttribute("aria-label", "View or edit agreement " + agreement.id);
      edit.appendChild(icon("edit"));
      actions.appendChild(edit);
      const control = document.createElement("button");
      control.type = "button";
      control.className = "agreement-icon-action";
      control.dataset.agreementId = agreement.id;
      control.dataset.deleteBlocker = blocker || "";
      if (!blocker) {
        control.classList.add("agreement-delete-action");
        control.title = "Delete (prototype)";
        control.setAttribute("aria-label", "Delete agreement " + agreement.id);
        control.appendChild(icon("delete"));
      } else {
        // A lock replaces Delete when jobs remain or services are unexpired.
        control.classList.add("agreement-delete-blocked");
        control.title = DELETE_REASONS[blocker];
        control.setAttribute("aria-label", DELETE_REASONS[blocker] + " (" + agreement.id + ")");
        control.appendChild(icon("locked"));
      }
      actions.appendChild(control);
      action.appendChild(actions);
      row.appendChild(action);
      tbody.appendChild(row);
    });
  }

  $("new-agreement").addEventListener("click", function () {
    window.location.href = agreementUrl(null);
  });
  $("agreements-list-body").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-agreement-id]");
    if (!button) return;
    showDeleteNotice(button.dataset.agreementId, button.dataset.deleteBlocker || null);
  });
  ["close-agreement-delete", "ok-agreement-delete"].forEach(function (id) {
    $(id).addEventListener("click", function () {
      $("agreement-delete-dialog").close();
    });
  });
  search.addEventListener("input", render);
  function refreshListHeader() {
    $("agreements-list-header").classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", refreshListHeader, { passive: true });
  refreshListHeader();
  // Restore freshly saved records when using browser Back / forward-cache.
  window.addEventListener("pageshow", render);
  render();
})();
