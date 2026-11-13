/* Agreements front page. No build step, server or external dependencies. */
(function () {
  "use strict";
  const $ = function (id) { return document.getElementById(id); };
  const store = window.AgreementsPrototypeStore;
  const source = window.AgreementPrototypeData;
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
    const totalRecurring = agreements.reduce(function (n, item) {
      return n + (item.services || []).filter(function (service) {
        return service.serviceType === "Regular, recurring";
      }).length;
    }, 0);
    const totalAdHoc = agreements.reduce(function (n, item) {
      return n + (item.services || []).filter(function (service) {
        return service.serviceType === "Ad hoc and one-off";
      }).length;
    }, 0);

    $("agreement-count").textContent = String(agreements.length);
    $("recurring-count").textContent = String(totalRecurring);
    $("adhoc-count").textContent = String(totalAdHoc);
    $("list-result-count").textContent = "Showing " + matching.length + " of " +
      agreements.length + " agreement" + (agreements.length === 1 ? "" : "s");

    if (!matching.length) {
      const row = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "agreements-empty";
      td.textContent = agreements.length ? "No agreements match your search." :
        "No agreements yet. Select New agreement to get started.";
      row.appendChild(td);
      tbody.appendChild(row);
      return;
    }

    matching.forEach(function (agreement) {
      const customer = store.customerFor(agreement);
      const site = store.siteFor(agreement);
      const services = agreement.services || [];
      const adhoc = services.filter(function (service) {
        return service.serviceType === "Ad hoc and one-off";
      }).length;
      const recurring = services.filter(function (service) {
        return service.serviceType === "Regular, recurring";
      }).length;
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
      const countCell = document.createElement("td");
      countCell.className = "agreement-service-counts";
      const adHocSpan = document.createElement("span");
      adHocSpan.textContent = adhoc + " ad hoc";
      countCell.appendChild(adHocSpan);
      const regularSpan = document.createElement("span");
      regularSpan.textContent = recurring + " recurring";
      countCell.appendChild(regularSpan);
      row.appendChild(countCell);
      const action = document.createElement("td");
      const button = document.createElement("a");
      button.href = agreementUrl(agreement.id);
      button.className = "btn btn-secondary agreement-view-link";
      button.textContent = "View / Edit";
      button.setAttribute("aria-label", "View or edit agreement " + agreement.id);
      action.appendChild(button);
      row.appendChild(action);
      tbody.appendChild(row);
    });
  }

  $("new-agreement").addEventListener("click", function () {
    window.location.href = agreementUrl(null);
  });
  search.addEventListener("input", render);
  // Restore freshly saved records when using browser Back / forward-cache.
  window.addEventListener("pageshow", render);
  render();
})();
