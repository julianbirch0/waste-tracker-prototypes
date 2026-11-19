/* WasteTracker Day Board V00026 — Job status prototype.
   Self-contained, file:// friendly; no backend or external services. */
(function () {
  "use strict";

  const KEY = "wastetracker.dayboard.v00026.statuses";
  let saved = { overrides: {}, clones: {}, nextReference: 900001 };
  try {
    const record = JSON.parse(localStorage.getItem(KEY) || "null");
    if (record && record.overrides && record.clones) {
      saved = record;
      saved.nextReference = Math.max(900001, Number(saved.nextReference) || 900001);
    }
  } catch (_) { /* file:// may not provide storage */ }

  let bridge = null;
  let bar, menu, backdrop, dialog, pendingAction = null;
  let followupJob = null;
  let menuOpen = false;

  const LABELS = {
    planned: "Planned",
    "at-site": "At site",
    "delivery-complete": "Delivery complete",
    "collection-complete": "Collection complete",
    "empty-complete": "Empty complete",
    "exchange-complete": "Exchange complete",
    "wait-load-complete": "Wait and Load complete",
    "service-complete": "Service complete",
    "on-way": "On way to facility",
    "at-facility": "At facility",
    accepted: "Accepted by facility",
    rejected: "Rejected by facility",
    cancelled: "Cancelled"
  };
  const SERVICE_COMPLETED = new Set([
    "delivery-complete", "collection-complete", "empty-complete",
    "exchange-complete", "wait-load-complete", "service-complete"
  ]);
  const TERMINAL = new Set(["delivery-complete", "service-complete", "accepted"]);
  const FAIL = /^failed-(customer|non-customer)-(outstanding|replanned|resolved|abandoned)$/;

  function safe(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {}
  }
  function status(job) { return (job && job.status) || "planned"; }
  function activity(job) {
    const parts = String(job.detail || "").split(" · ");
    const name = (parts[0] || "").trim().toLowerCase();
    return name === "other" ? "other:" + (parts[1] || "").trim().toLowerCase() : name;
  }
  function activityName(job) {
    const parts = String(job.detail || "").split(" · ");
    return parts[0].toLowerCase() === "other" ? (parts[1] || "Other service") : parts[0];
  }
  function completion(job) {
    switch (activity(job)) {
      case "deliver": return "delivery-complete";
      case "collect":
      case "recover": return "collection-complete";
      case "empty": return "empty-complete";
      case "exchange": return "exchange-complete";
      case "wait and load": return "wait-load-complete";
      default: return activity(job).indexOf("other:") === 0 ? "service-complete" : null;
    }
  }
  function needsFacility(job) {
    const name = activity(job);
    if (name === "deliver" || name === "recover" || name.indexOf("other:") === 0) return false;
    if (name === "collect" && /\bbin\b/i.test(job.detail || "")) return false;
    return ["collect", "empty", "exchange", "wait and load"].includes(name);
  }
  function isFinal(job) {
    const code = status(job);
    if (TERMINAL.has(code)) return true;
    if (code === "collection-complete" && !needsFacility(job)) return true;
    return false;
  }
  function title(job) {
    const code = status(job);
    const m = code.match(FAIL);
    if (m) return "Failed – " + m[1] + " – " + m[2];
    return LABELS[code] || code;
  }
  function lines(job) {
    const m = status(job).match(FAIL);
    if (m) return ["Failed – " + m[1], m[2].charAt(0).toUpperCase() + m[2].slice(1)];
    return [title(job)];
  }
  function colour(job) {
    const code = status(job), m = code.match(FAIL);
    if (code === "planned") return "neutral";
    if (code === "cancelled" || (m && m[2] === "abandoned")) return "closed";
    if (m && m[2] === "resolved") return "success";
    if (m || code === "rejected") return "attention";
    if (isFinal(job)) return "success";
    return "progress";
  }
  function restoreDay(day, date) {
    Object.keys(day.jobs).forEach(function (id) {
      if (saved.overrides[id]) Object.assign(day.jobs[id], JSON.parse(JSON.stringify(saved.overrides[id])));
    });
    Object.keys(saved.clones).forEach(function (id) {
      if (!id.endsWith("@" + date)) return;
      const job = JSON.parse(JSON.stringify(saved.clones[id]));
      if (saved.overrides[id]) Object.assign(job, JSON.parse(JSON.stringify(saved.overrides[id])));
      day.jobs[id] = job;
      if (!day.unallocated.includes(id)) day.unallocated.push(id);
    });
  }
  function resolveClone(id) {
    const value = saved.clones[id];
    if (!value) return null;
    return Object.assign({}, value, saved.overrides[id] || {});
  }
  function hydrateJob(job) {
    if (!job) return null;
    const override = saved.overrides[job.id];
    return override ? Object.assign({}, job, JSON.parse(JSON.stringify(override))) : job;
  }
  function remember(job) {
    const values = {};
    ["status", "statusHistory", "actuals", "replannedFrom", "replacementJobId",
      "facility"].forEach(function (key) {
      if (job[key] !== undefined) values[key] = JSON.parse(JSON.stringify(job[key]));
    });
    saved.overrides[job.id] = values;
    if (job.replannedFrom) saved.clones[job.id] = JSON.parse(JSON.stringify(job));
  }
  function addEvent(job, code, note, action) {
    job.status = code;
    if (!Array.isArray(job.statusHistory)) job.statusHistory = [];
    job.statusHistory.push({
      status: code, action: action || title(job), note: note || "",
      at: new Date().toISOString(), by: "Office (prototype)"
    });
    remember(job);
  }
  function propagate(job, result) {
    const visited = new Set();
    let parent = job.replannedFrom;
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      const ancestor = bridge.getJobById(parent);
      if (!ancestor) break;
      const m = status(ancestor).match(FAIL);
      if (m) addEvent(ancestor, "failed-" + m[1] + "-" + result, "", "Replacement " + result);
      parent = ancestor.replannedFrom;
    }
  }
  function afterChange(message, detail) {
    save();
    bridge.commitStatusChange();
    bridge.showToast(message, detail);
    closeMenu();
  }

  function selected() {
    if (!bridge) return [];
    const state = bridge.getState();
    return bridge.getSelectedIds().map(function (id) { return state.jobs[id]; }).filter(Boolean);
  }
  function sameService(jobs) { return jobs.every(function (job) { return activity(job) === activity(jobs[0]); }); }
  function sameTrip(jobs) {
    if (!jobs.length) return false;
    const first = bridge.findJob(jobs[0].id);
    return jobs.every(function (job) {
      const location = bridge.findJob(job.id);
      return location && first && location.tripId === first.tripId;
    });
  }
  function unallocated(jobs) {
    return jobs.length && jobs.every(function (job) {
      const location = bridge.findJob(job.id);
      return location && location.zone === "unallocated";
    });
  }
  function option(key, label, ok, reason, correction) {
    return { key: key, label: label, ok: Boolean(ok), reason: reason || "", correction: Boolean(correction) };
  }
  function options(jobs) {
    if (!jobs.length) return [];
    const all = function (test) { return jobs.every(test); };
    const planned = all(function (j) { return status(j) === "planned"; });
    const statuses = jobs.map(status);
    const failures = all(function (j) { return /^failed-(customer|non-customer)-outstanding$/.test(status(j)); });
    const anyPlanned = statuses.some(function (s) { return s === "planned"; });
    const anyCompletion = jobs.some(function (j) { return SERVICE_COMPLETED.has(status(j)); });
    const canComplete = all(function (j) {
      return status(j) === "planned" || (status(j) === "at-site" && activity(j) === "wait and load");
    });
    const same = sameService(jobs);
    const tripOk = sameTrip(jobs);
    const result = [];
    const offTrip = unallocated(jobs);
    if (offTrip) {
      result.push(option("cancel", "Cancel " + (jobs.length === 1 ? "Job" : "Jobs"),
        planned, "Only Planned Jobs can be cancelled."));
      return result;
    }
    if (anyPlanned || canComplete || statuses.some(function (s) { return s === "at-site"; })) {
      const label = same && completion(jobs[0])
        ? "Mark as " + title({ status: completion(jobs[0]) })
        : "Mark as complete";
      result.push(option("complete", label, tripOk && canComplete && same && Boolean(completion(jobs[0])),
        !same ? "All selected Jobs must have the same service to complete them together."
          : !canComplete ? "All selected Jobs must be ready for service completion."
          : "All selected Jobs must belong to the same Trip."));
      if (jobs.every(function (j) { return activity(j) === "wait and load"; })) {
        result.push(option("at-site", "Mark as At site",
          tripOk && planned, "All selected Jobs must be Planned."));
      }
      result.push(option("fail-customer", "Mark as Failed – customer", tripOk &&
        all(function (j) { return status(j) === "planned" || status(j) === "at-site"; }),
        "All selected Jobs must be Planned or At site."));
      result.push(option("fail-non-customer", "Mark as Failed – non-customer", tripOk &&
        all(function (j) { return status(j) === "planned" || status(j) === "at-site"; }),
        "All selected Jobs must be Planned or At site."));
      if (anyPlanned) result.push(option("cancel", "Cancel " + (jobs.length === 1 ? "Job" : "Jobs"),
        tripOk && planned, "Only Planned, unattempted Jobs can be cancelled."));
    }
    if (anyCompletion || statuses.some(function (s) { return s === "rejected"; })) {
      const ready = all(function (j) {
        return (SERVICE_COMPLETED.has(status(j)) && needsFacility(j)) || status(j) === "rejected";
      });
      result.push(option("on-way", "On way to facility", tripOk && ready,
        "All selected Jobs must have completed a waste-moving service or been rejected by a facility."));
    }
    if (statuses.some(function (s) { return s === "on-way"; })) {
      result.push(option("at-facility", "At facility",
        tripOk && all(function (j) { return status(j) === "on-way"; }),
        "All selected Jobs must be On way to facility."));
    }
    if (statuses.some(function (s) { return s === "at-facility"; })) {
      const ready = tripOk && all(function (j) { return status(j) === "at-facility"; });
      result.push(option("accepted", "Accepted by facility", ready, "All selected Jobs must be At facility."));
      result.push(option("rejected", "Rejected by facility", ready, "All selected Jobs must be At facility."));
    }
    if (failures || statuses.some(function (s) { return s.indexOf("failed-") === 0; })) {
      result.push(option("replan", "Replan " + (jobs.length === 1 ? "Job" : "Jobs"),
        tripOk && failures, "All selected Jobs must be Failed – outstanding."));
      result.push(option("abandon", "Abandon " + (jobs.length === 1 ? "Job" : "Jobs"),
        tripOk && failures, "All selected Jobs must be Failed – outstanding."));
    }
    if (anyCompletion) {
      result.push(option("revert", "Revert to Planned",
        tripOk && all(function (j) { return SERVICE_COMPLETED.has(status(j)); }),
        "Only Jobs at service-complete stage can use this simple correction.", true));
    }
    if (failures && jobs.every(function (j) { return status(j) === status(jobs[0]); })) {
      const fault = status(jobs[0]).includes("non-customer") ? "customer" : "non-customer";
      result.push(option("correct-fault", "Change failure to " + fault,
        tripOk, "All selected Jobs must have the same outstanding failure classification.", true));
    }
    return result;
  }
  function menuMarkup() {
    const jobs = selected(), opts = options(jobs);
    let hasCorrections = false;
    return opts.map(function (item) {
      let heading = "";
      if (item.correction && !hasCorrections) {
        heading = '<div class="status-menu-section">Corrections</div>';
        hasCorrections = true;
      }
      return heading + '<div class="status-option">' +
        '<button type="button" data-status-action="' + item.key + '"' +
        (item.ok ? "" : " disabled") + '>' + safe(item.label) + '</button>' +
        (!item.ok ? '<div class="status-option-reason">' + safe(item.reason) + '</div>' : '') +
        '</div>';
    }).join("") || '<div class="status-option-reason">No status actions available for this selection.</div>';
  }
  function closeMenu() {
    menuOpen = false;
    if (menu) menu.hidden = true;
    if (bar) bar.querySelector(".status-actions-trigger").setAttribute("aria-expanded", "false");
  }
  function refresh() {
    if (!bar || !bridge) return;
    const jobs = selected();
    bar.hidden = jobs.length === 0;
    bar.querySelector(".status-selected-count").textContent =
      jobs.length + (jobs.length === 1 ? " Job selected" : " Jobs selected");
    if (menuOpen) menu.innerHTML = menuMarkup();
  }

  function titleForAction(key, jobs) {
    if (key === "complete") return jobs.length === 1 ? "Complete Job" : "Complete " + jobs.length + " Jobs";
    if (key === "fail-customer") return "Mark as Failed – customer";
    if (key === "fail-non-customer") return "Mark as Failed – non-customer";
    if (key === "cancel") return "Cancel " + (jobs.length === 1 ? "Job" : jobs.length + " Jobs");
    if (key === "replan") return "Replan " + (jobs.length === 1 ? "Job" : jobs.length + " Jobs");
    if (key === "abandon") return "Abandon " + (jobs.length === 1 ? "Job" : jobs.length + " Jobs");
    if (key === "revert") return "Revert to Planned";
    if (key === "correct-fault") return "Correct failure classification";
    const item = options(jobs).find(function (o) { return o.key === key; });
    return item ? item.label : "Update Jobs";
  }
  function formFields(key, jobs) {
    const single = jobs.length === 1;
    if (key === "complete") {
      const details = single ? '<p class="status-muted">Optional actuals for Job ' +
        safe(jobs[0].reference) + '. You can leave everything blank.</p>' +
        '<div class="status-form-grid"><label>Actual quantity<input type="number" min="0" step="any" name="quantity" placeholder="Optional"></label>' +
        (needsFacility(jobs[0]) ? '<label>Actual weight (kg)<input type="number" min="0" step="any" name="weight" placeholder="Optional"></label>' : '') +
        '</div><label>Job note<textarea name="note" rows="3" placeholder="Optional operational note"></textarea></label>'
        : '<p class="status-muted">Individual actual quantities and Job notes cannot be entered in a bulk update. Update Jobs separately to record those details.</p>';
      return details;
    }
    if (key === "fail-customer" || key === "fail-non-customer") {
      return '<label>' + (single ? "Job note (optional)" : "Shared Job note (optional)") +
        '<textarea name="note" rows="3" placeholder="Why was the work unsuccessful?"></textarea></label>' +
        (single ? '<p class="status-muted">After recording the failure, you can replan, abandon or leave it outstanding.</p>'
          : '<p class="status-muted">The same note will be recorded against each selected Job.</p>');
    }
    if (key === "cancel") return '<label>' + (single ? "Cancellation reason (optional)" : "Shared cancellation reason (optional)") +
      '<textarea name="note" rows="3" placeholder="Reason for cancellation"></textarea></label>' +
      (!single ? '<p class="status-muted">The same reason will be recorded against every selected Job.</p>' : '');
    if (key === "replan") return '<label>New Job date<input type="date" name="date" required value="' +
      safe(bridge.getToday()) + '"></label><p class="status-muted">Each replacement will be created as Planned in Unallocated on this date. ' +
      'All selected Jobs will use the same date. The existing failed Jobs remain on their original Trips.</p>';
    if (key === "abandon") return '<p class="status-muted">These failed Jobs will be closed without replacement. ' +
      'Earlier failures in their replanning chains will also be marked Abandoned.</p>';
    if (key === "revert") return '<p class="status-muted">This is a correction, not normal status progression. ' +
      'The change will be recorded in the Job history and will not restore previous planning Undo steps.</p>';
    if (key === "correct-fault") return '<p class="status-muted">This corrects the original fault classification ' +
      'without losing the history of the initial report.</p>';
    if (key === "on-way") return '<p class="status-muted">These Jobs will be marked On way to facility. ' +
      'They will remain on their original Trip.</p>';
    return '<p class="status-muted">Apply this status to ' + jobs.length +
      (jobs.length === 1 ? ' Job?' : ' Jobs?') + '</p>';
  }
  function openDialog(key, jobs) {
    if (!jobs || !jobs.length) return;
    const fresh = options(jobs).find(function (o) { return o.key === key; });
    if (!fresh || !fresh.ok) { refresh(); return; }
    closeMenu();
    pendingAction = { key: key, ids: jobs.map(function (j) { return j.id; }) };
    const question = titleForAction(key, jobs);
    const buttonLabel = key === "complete" ? "Complete" : key === "replan" ? "Replan" :
      key === "cancel" ? "Confirm cancellation" : key === "abandon" ? "Abandon" :
      key === "revert" ? "Confirm correction" : "Confirm";
    dialog.innerHTML = '<header class="status-dialog-head"><h2 id="status-dialog-title">' +
      safe(question) + '</h2><button type="button" class="status-dialog-x" data-dialog-close aria-label="Close">×</button></header>' +
      '<form id="status-action-form"><div class="status-dialog-body">' +
      '<div class="status-job-count">' + jobs.length +
      (jobs.length === 1 ? ' Job' : ' Jobs') + ' selected</div>' +
      formFields(key, jobs) +
      '</div><footer class="status-dialog-footer">' +
      '<button type="button" class="btn btn-secondary" data-dialog-close>Back</button>' +
      '<button type="submit" class="btn btn-primary">' + safe(buttonLabel) + '</button>' +
      '</footer></form>';
    backdrop.hidden = false;
    dialog.querySelector("input,textarea,button[data-dialog-close]").focus();
  }
  function closeDialog() {
    backdrop.hidden = true;
    pendingAction = null;
    followupJob = null;
  }
  function followup(id) {
    const job = bridge.getJobById(id);
    if (!job || !/^failed-(customer|non-customer)-outstanding$/.test(status(job))) return;
    followupJob = id;
    pendingAction = null;
    dialog.innerHTML = '<header class="status-dialog-head"><h2>Failure recorded</h2>' +
      '<button type="button" data-dialog-close class="status-dialog-x" aria-label="Close">×</button></header>' +
      '<div class="status-dialog-body"><p>Job ' + safe(job.reference) +
      ' is now <strong>' + safe(title(job)) + '</strong>.</p>' +
      '<p class="status-muted">What would you like to do next?</p></div>' +
      '<footer class="status-dialog-footer status-followup-footer">' +
      '<button type="button" class="btn btn-secondary" data-followup="leave">Leave outstanding</button>' +
      '<button type="button" class="btn btn-secondary" data-followup="abandon">Abandon</button>' +
      '<button type="button" class="btn btn-primary" data-followup="replan">Replan</button>' +
      '</footer>';
    backdrop.hidden = false;
  }
  function apply(event) {
    event.preventDefault();
    const pending = pendingAction;
    if (!pending) return;
    const jobs = pending.ids.map(bridge.getJobById).filter(Boolean);
    if (jobs.length !== pending.ids.length) return;
    const valid = options(jobs).find(function (o) { return o.key === pending.key && o.ok; });
    if (!valid) { closeDialog(); return; }
    const form = dialog.querySelector("form");
    const data = new FormData(form), key = pending.key;
    const note = String(data.get("note") || "").trim();
    const date = String(data.get("date") || "");
    if (key === "replan" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const qty = String(data.get("quantity") || "");
    const weight = String(data.get("weight") || "");
    let lastJob = null;
    jobs.forEach(function (job) {
      let next = "";
      switch (key) {
        case "complete":
          next = completion(job);
          if (jobs.length === 1 && (qty !== "" || weight !== "")) {
            const actuals = Object.assign({}, job.actuals || {});
            if (qty !== "") actuals.quantity = Number(qty);
            if (weight !== "") actuals.weightKg = Number(weight);
            job.actuals = actuals;
          }
          break;
        case "fail-customer": next = "failed-customer-outstanding"; break;
        case "fail-non-customer": next = "failed-non-customer-outstanding"; break;
        case "cancel": next = "cancelled"; break;
        case "at-site": next = "at-site"; break;
        case "on-way": next = "on-way"; break;
        case "at-facility": next = "at-facility"; break;
        case "accepted": next = "accepted"; break;
        case "rejected": next = "rejected"; break;
        case "abandon": {
          const m = status(job).match(FAIL);
          next = "failed-" + m[1] + "-abandoned";
          break;
        }
        case "replan": {
          const m = status(job).match(FAIL);
          next = "failed-" + m[1] + "-replanned";
          break;
        }
        case "revert": next = "planned"; break;
        case "correct-fault": {
          const m = status(job).match(FAIL);
          next = "failed-" + (m[1] === "customer" ? "non-customer" : "customer") + "-outstanding";
          break;
        }
        default: return;
      }
      addEvent(job, next, note, key);
      if (key === "replan") {
        const reference = String(saved.nextReference++);
        const copy = {
          id: "job-r" + reference + "@" + date,
          reference: reference, customer: job.customer, detail: job.detail,
          mapX: job.mapX, mapY: job.mapY, status: "planned",
          replannedFrom: job.id,
          statusHistory: [{
            status: "planned", action: "Replanned from Job " + job.reference,
            at: new Date().toISOString(), by: "Office (prototype)", note: ""
          }]
        };
        bridge.addReplacementJob(copy, date);
        remember(copy);
        job.replacementJobId = copy.id;
        remember(job);
        lastJob = copy;
      }
      if (key === "abandon" || key === "cancel") propagate(job, "abandoned");
      else if (key === "accepted" || (key === "complete" && isFinal(job))) propagate(job, "resolved");
    });
    const singleFailure = jobs.length === 1 &&
      (key === "fail-customer" || key === "fail-non-customer");
    closeDialog();
    afterChange(key === "replan" ? "Jobs replanned" : key === "complete" ? "Jobs completed" :
      key === "cancel" ? "Jobs cancelled" : key === "abandon" ? "Jobs abandoned" :
      key === "revert" || key === "correct-fault" ? "Correction recorded" : "Job statuses updated",
      key === "replan" ? jobs.length + " replacement " + (jobs.length === 1 ? "Job" : "Jobs") +
        " created in Unallocated for " + date + "."
        : jobs.length + (jobs.length === 1 ? " Job updated." : " Jobs updated."));
    if (key === "replan" && lastJob) {
      const link = document.getElementById("status-replan-link");
      if (link) link.remove();
      const next = document.createElement("button");
      next.id = "status-replan-link";
      next.className = "status-replan-link";
      next.textContent = "View replanned " + (jobs.length === 1 ? "Job" : "Jobs") + " on " + date;
      next.addEventListener("click", function () {
        next.remove();
        bridge.navigateToDate(date);
      });
      bar.appendChild(next);
    }
    if (singleFailure) followup(jobs[0].id);
  }
  function bind(adapter) {
    bridge = adapter;
    bar = document.createElement("div");
    bar.className = "status-floating";
    bar.hidden = true;
    bar.innerHTML = '<div class="status-floating-main"><strong class="status-selected-count"></strong>' +
      '<button type="button" class="btn btn-primary status-actions-trigger" aria-expanded="false">Actions ▾</button>' +
      '<button type="button" class="status-clear" title="Clear selection" aria-label="Clear selection">×</button></div>' +
      '<div class="status-menu" hidden></div>';
    document.body.appendChild(bar);
    menu = bar.querySelector(".status-menu");
    backdrop = document.createElement("div");
    backdrop.className = "status-dialog-backdrop";
    backdrop.hidden = true;
    backdrop.innerHTML = '<section class="status-dialog" role="dialog" aria-modal="true" aria-labelledby="status-dialog-title" tabindex="-1"></section>';
    document.body.appendChild(backdrop);
    dialog = backdrop.querySelector(".status-dialog");

    bar.querySelector(".status-actions-trigger").addEventListener("click", function () {
      menuOpen = !menuOpen;
      menu.hidden = !menuOpen;
      if (menuOpen) menu.innerHTML = menuMarkup();
      this.setAttribute("aria-expanded", String(menuOpen));
    });
    bar.querySelector(".status-clear").addEventListener("click", function () {
      bridge.clearSelection();
      closeMenu();
    });
    menu.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-status-action]");
      if (!button || button.disabled) return;
      openDialog(button.dataset.statusAction, selected());
    });
    dialog.addEventListener("click", function (event) {
      if (event.target.closest("[data-dialog-close]")) { closeDialog(); return; }
      const target = event.target.closest("[data-followup]");
      if (!target || !followupJob) return;
      const id = followupJob;
      if (target.dataset.followup === "leave") { closeDialog(); return; }
      const key = target.dataset.followup;
      closeDialog();
      const job = bridge.getJobById(id);
      if (job) openDialog(key, [job]);
    });
    dialog.addEventListener("submit", apply);
    backdrop.addEventListener("pointerdown", function (event) {
      if (event.target === backdrop) closeDialog();
    });
    document.addEventListener("pointerdown", function (event) {
      if (menuOpen && !bar.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", function (event) {
      if (!backdrop.hidden) {
        if (event.key === "Escape") { event.preventDefault(); closeDialog(); }
        event.stopImmediatePropagation();
      } else if (menuOpen && event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        event.stopImmediatePropagation();
      }
    }, true);
    refresh();
  }
  function reset() {
    saved = { overrides: {}, clones: {}, nextReference: 900001 };
    try { localStorage.removeItem(KEY); } catch (_) {}
    if (bar) {
      const link = document.getElementById("status-replan-link");
      if (link) link.remove();
      closeMenu();
    }
    if (backdrop) closeDialog();
  }

  window.DayBoardStatus = {
    bind: bind, refresh: refresh, restoreDay: restoreDay, resolveClone: resolveClone,
    reset: reset, title: title, lines: lines, colour: colour, status: status,
    hydrateJob: hydrateJob
  };
}());