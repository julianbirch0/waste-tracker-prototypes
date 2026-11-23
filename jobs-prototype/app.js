(function () {
  "use strict";

  const app = document.getElementById("app");
  const status = window.DayBoardStatus;
  const storageKey = "wastetracker.jobs.prototype.v1";
  const pageSize = 15;
  const filters = { search: "", date: "", status: "", trip: "" };
  const dateLabel = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
  const sections = [
    ["Customer and site", [["customer", "Customer"], ["siteName", "Site"]]],
    ["Service details", [["detail", "Activity and waste item"], ["quantity", "Quantity", "number"]]],
    ["Schedule and assignment", [["date", "Scheduled date", "date"], ["timingPreference", "Timing preference"], ["trip", "Trip", "select"]]],
    ["Notes", [["notes", "Office notes", "textarea"], ["driverNotes", "Driver instructions", "textarea"]]]
  ];
  let page = 0;
  let editing = false;
  let notice = "";

  function localDate(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  const today = localDate(0);
  const tripNames = window.DayBoardData.makeInitialState(today).trips.map(trip => trip.name);
  function seedJobs() {
    const examples = [
      ["planned", "planned", "collection-complete", "on-way", "accepted", "cancelled", "at-facility", "failed-customer-outstanding", "rejected"],
      ["planned"], ["planned"]
    ];
    return examples.flatMap((stages, index) => {
      const date = localDate(index);
      const day = window.DayBoardData.makeInitialState(date);
      const allocated = day.trips.flatMap(trip => trip.sequenced.slice(0, 2).map(id => ({ ...day.jobs[id], trip: trip.name })));
      const rows = [...allocated, ...day.unallocated.slice(0, 3).map(id => ({ ...day.jobs[id], trip: "" }))];
      let sample = 0;
      return rows.map(job => {
        const code = index === 0 && job.detail.startsWith("Wait and Load ·") ? "at-site" :
          job.detail.startsWith("Collect ·") && !/\bbin\b/i.test(job.detail) ? stages[sample++ % stages.length] : "planned";
        return {
          ...job, date, reference: String(Number(job.reference) + index * 1000),
          status: code, notes: "", driverNotes: "",
          statusHistory: code === "planned" ? [] : [{ status: code, at: date }]
        };
      });
    });
  }

  function loadJobs() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(stored)) return stored;
    } catch (_) {
      // Browser storage can be unavailable when opened directly from disk.
    }
    return seedJobs();
  }

  let jobs = loadJobs();

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function formatDate(value) {
    return value ? dateLabel.format(new Date(value + "T12:00:00")) : "—";
  }

  function badge(job) {
    return `<span class="status ${status.colour(job)}">${esc(status.title(job))}</span>`;
  }

  function options(items, selected) {
    return items.map(([value, label]) =>
      `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`).join("");
  }

  function matchedJobs() {
    const term = filters.search.trim().toLowerCase();
    return jobs.filter(job =>
      (!term || [job.reference, job.customer, job.siteName, job.detail].some(value => String(value ?? "").toLowerCase().includes(term))) &&
      (!filters.date || filters.date === job.date) &&
      (!filters.status || filters.status === job.status) &&
      (!filters.trip || (filters.trip === "unallocated" ? !job.trip : filters.trip === job.trip))
    ).sort((a, b) => a.date.localeCompare(b.date) || String(a.reference).localeCompare(String(b.reference), "en-GB", { numeric: true }));
  }

  function renderList() {
    const statuses = [...new Set(jobs.map(job => job.status))].map(code => [code, status.title({ status: code })]);
    const trips = tripNames.map(name => [name, name]);
    app.innerHTML = `
      <div class="heading"><h1>Jobs</h1></div>
      <form class="panel filters" id="filters" aria-label="Filter Jobs">
        <label>Search<input type="search" name="search" placeholder="Job number, customer or site" value="${esc(filters.search)}"></label>
        <label>Scheduled date<input type="date" name="date" value="${esc(filters.date)}"></label>
        <label>Status<select name="status">${options([["", "All statuses"], ...statuses], filters.status)}</select></label>
        <label>Trip<select name="trip">${options([["", "All Trips"], ["unallocated", "Unallocated"], ...trips], filters.trip)}</select></label>
        <button type="button" data-action="reset">Clear filters</button>
      </form>
      <div class="panel" id="results"></div>`;
    renderResults();
  }

  function renderResults() {
    const matches = matchedJobs();
    const start = page * pageSize;
    const rows = matches.slice(start, start + pageSize);
    document.getElementById("results").innerHTML = `
      <div class="table-wrap">${rows.length ? `<table aria-label="Jobs">
        <thead><tr><th scope="col">Job</th><th scope="col">Customer / Site</th><th scope="col">Service</th><th scope="col">Scheduled</th><th scope="col">Trip</th><th scope="col">Status</th></tr></thead>
        <tbody>${rows.map(job => `<tr>
          <td><a href="#job=${encodeURIComponent(job.id)}">${esc(job.reference)}</a></td>
          <td>${esc(job.customer)}<br><small>${esc(job.siteName)}</small></td>
          <td>${esc(job.detail)}<br><small>Quantity ${esc(job.quantity)}</small></td>
          <td>${formatDate(job.date)}<br><small>${esc(job.timingPreference)}</small></td>
          <td>${esc(job.trip || "Unallocated")}</td><td>${badge(job)}</td>
        </tr>`).join("")}</tbody></table>` : '<p class="empty">No Jobs match these filters.</p>'}</div>
      <div class="pagination"><span role="status" aria-live="polite">${rows.length ? `${start + 1}–${start + rows.length} of ${matches.length} Jobs` : "0 Jobs"}</span>
        <div class="actions"><button type="button" data-action="previous"${page === 0 ? " disabled" : ""}>Previous</button>
        <button type="button" data-action="next"${start + pageSize >= matches.length ? " disabled" : ""}>Next</button></div>
      </div>`;
  }

  function editField(job, [key, label, type = "text"]) {
    const value = esc(job[key]);
    let control;
    if (type === "select") {
      control = `<select name="${key}">${options([["", "Unallocated"], ...tripNames.map(name => [name, name])], job[key])}</select>`;
    } else if (type === "textarea") {
      control = `<textarea name="${key}" rows="3" maxlength="2000">${value}</textarea>`;
    } else {
      control = `<input type="${type}" name="${key}" value="${value}"${type === "number" ? ' min="1" step="1"' : ""}${type === "text" ? ' maxlength="160"' : ""} required>`;
    }
    return `<label>${label}${control}</label>`;
  }

  function renderJob(job) {
    const cards = sections.map(([heading, fields]) => `
      <section class="panel"><h2>${heading}</h2>
        ${editing ? `<div class="fields">${fields.map(field => editField(job, field)).join("")}</div>` :
          `<dl>${fields.map(([key, label]) => {
            const value = key === "date" ? formatDate(job[key]) : key === "trip" ? job[key] || "Unallocated" : job[key] || "—";
            return `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
          }).join("")}</dl>`}
      </section>`).join("");
    const history = `<section class="panel full"><h2>Status history</h2>
      ${job.statusHistory.length ? `<ol class="history">${job.statusHistory.map(event =>
        `<li>${esc(status.title(event))} · ${formatDate(event.at)}</li>`).join("")}</ol>`
        : '<p class="muted">No status changes recorded.</p>'}</section>`;
    app.innerHTML = `
      <a class="back" href="#">All Jobs</a>
      <div class="heading"><div><h1>${editing ? "Edit Job" : "Job"} ${esc(job.reference)}</h1>${badge(job)}</div>
      ${editing ? "" : '<button type="button" class="primary" data-action="edit">Edit Job</button>'}</div>
      ${editing ? `<form id="job-form"><div class="sections">${cards}</div>
        <div class="actions"><button class="primary" type="submit">Save changes</button>
        <button type="button" data-action="cancel">Cancel</button></div></form>` :
        `<div class="sections">${cards}${history}</div>`}
      <p id="notice" role="status">${esc(notice)}</p>`;
  }

  function currentJob() {
    const id = new URLSearchParams(location.hash.slice(1)).get("job");
    return jobs.find(job => job.id === id);
  }

  function render() {
    const job = currentJob();
    document.title = job ? `Job ${job.reference} | WasteTracker` : "Jobs | WasteTracker";
    if (job) renderJob(job);
    else if (location.hash) app.innerHTML = '<div class="heading"><h1>Job unavailable</h1></div><a href="#">All Jobs</a>';
    else renderList();
  }

  app.addEventListener("input", event => {
    if (event.target.form?.id !== "filters") return;
    filters[event.target.name] = event.target.value;
    page = 0;
    renderResults();
  });

  app.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    switch (button.dataset.action) {
      case "edit":
      case "cancel":
        editing = button.dataset.action === "edit";
        notice = "";
        render();
        app.querySelector(editing ? "#job-form input" : "[data-action=edit]").focus();
        break;
      case "reset":
        for (const key of Object.keys(filters)) filters[key] = "";
        page = 0;
        renderList();
        app.querySelector("[name=search]").focus();
        break;
      case "previous":
      case "next": {
        const action = button.dataset.action;
        page += action === "next" ? 1 : -1;
        renderResults();
        const buttons = app.querySelectorAll(".pagination button");
        (Array.from(buttons).find(item => item.dataset.action === action && !item.disabled) ||
          Array.from(buttons).find(item => !item.disabled))?.focus();
        break;
      }
    }
  });

  app.addEventListener("submit", event => {
    event.preventDefault();
    if (event.target.id !== "job-form" || !editing) return;
    const job = currentJob();
    if (!job) return;
    const changes = Object.fromEntries([...new FormData(event.target)].map(([key, value]) => [key, value.trim()]));
    if (["customer", "siteName", "detail", "timingPreference"].some(key => !changes[key])) {
      document.getElementById("notice").textContent = "Fill in the required fields before saving.";
      return;
    }
    changes.quantity = Number(changes.quantity);
    Object.assign(job, changes);
    editing = false;
    notice = "Job saved.";
    try {
      localStorage.setItem(storageKey, JSON.stringify(jobs));
    } catch (_) {
      notice = "Job saved for this session. Browser storage is unavailable.";
    }
    page = 0;
    render();
    app.querySelector("[data-action=edit]").focus();
  });

  window.addEventListener("hashchange", () => {
    editing = false;
    notice = "";
    render();
    window.scrollTo(0, 0);
  });

  render();
}());
