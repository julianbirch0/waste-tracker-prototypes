/* WasteTracker Day Board V00001
   Standalone, file:// compatible. Native HTML drag-and-drop; no dependencies. */
(function () {
  "use strict";

  const STORAGE_KEY = "wastetracker.dayboard.v00001.placements";
  const MAX_HISTORY = 100;
  const board = document.getElementById("board");
  const scroller = document.getElementById("board-scroll");
  const undoButton = document.getElementById("undo");
  const redoButton = document.getElementById("redo");
  const summary = document.getElementById("board-summary");
  const toastElement = document.getElementById("toast");

  let state = window.DayBoardData.makeInitialState();
  let undoStack = [];
  let redoStack = [];
  let draggingJobId = null;
  let toastTimeout = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function padNumber(n) { return String(n).padStart(2, "0"); }

  function getPlacement() {
    return {
      unallocated: state.unallocated.slice(),
      trips: state.trips.map(function (trip) {
        return {
          id: trip.id,
          unsequenced: trip.unsequenced.slice(),
          sequenced: trip.sequenced.slice()
        };
      })
    };
  }

  function placementIsValid(placement) {
    if (!placement || !Array.isArray(placement.unallocated) ||
        !Array.isArray(placement.trips) || placement.trips.length !== state.trips.length) {
      return false;
    }
    const all = placement.unallocated.slice();
    for (let i = 0; i < state.trips.length; i += 1) {
      const current = placement.trips[i];
      if (!current || current.id !== state.trips[i].id ||
          !Array.isArray(current.unsequenced) || !Array.isArray(current.sequenced)) {
        return false;
      }
      all.push.apply(all, current.unsequenced);
      all.push.apply(all, current.sequenced);
    }
    const jobIds = Object.keys(state.jobs);
    return all.length === jobIds.length &&
      new Set(all).size === jobIds.length &&
      all.every(function (id) { return Object.prototype.hasOwnProperty.call(state.jobs, id); });
  }

  function applyPlacement(placement) {
    state.unallocated = placement.unallocated.slice();
    placement.trips.forEach(function (saved, index) {
      state.trips[index].unsequenced = saved.unsequenced.slice();
      state.trips[index].sequenced = saved.sequenced.slice();
    });
  }

  function readSavedPlacement() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.version === 1 && placementIsValid(parsed.placement)) {
        applyPlacement(parsed.placement);
      }
    } catch (error) {
      // Some browsers restrict localStorage when opening file:// pages.
      // The board remains fully usable in memory in that case.
    }
  }

  function persistPlacement() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, placement: getPlacement() }));
    } catch (error) {
      // Persisting is a convenience only, not a dependency for dragging.
    }
  }

  function getTrip(tripId) {
    return state.trips.find(function (trip) { return trip.id === tripId; }) || null;
  }

  function getList(tripId, zone) {
    if (zone === "unallocated") return state.unallocated;
    const trip = getTrip(tripId);
    return trip && (zone === "sequenced" || zone === "unsequenced") ? trip[zone] : null;
  }

  function findJob(jobId) {
    const unallocatedIndex = state.unallocated.indexOf(jobId);
    if (unallocatedIndex !== -1) return { tripId: "", zone: "unallocated", index: unallocatedIndex };
    for (const trip of state.trips) {
      for (const zone of ["unsequenced", "sequenced"]) {
        const index = trip[zone].indexOf(jobId);
        if (index !== -1) return { tripId: trip.id, zone: zone, index: index };
      }
    }
    return null;
  }

  function describeLocation(location) {
    if (!location) return "unknown location";
    if (location.zone === "unallocated") return "Unallocated";
    const trip = getTrip(location.tripId);
    const name = trip ? trip.name : "Trip";
    return location.zone === "unsequenced"
      ? name + " · Unsequenced"
      : name + " · position " + padNumber(location.index + 1);
  }

  function renderCard(jobId, zone, index) {
    const job = state.jobs[jobId];
    if (!job) return "";
    const marker = zone === "sequenced" ?
      '<span class="job-sequence" title="Position on this trip, not job reference">' +
      padNumber(index + 1) + '</span>' : "";
    const ref = escapeHtml(job.reference);
    return '<article class="job-card" data-job-id="' + escapeHtml(jobId) + '">' +
      '<button type="button" class="drag-handle" draggable="true" ' +
        'aria-label="Drag Job ' + ref + ' to a new position or trip" ' +
        'title="Drag Job ' + ref + '">' +
        '<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">' +
          '<circle cx="3" cy="3" r="1.45"/><circle cx="9" cy="3" r="1.45"/>' +
          '<circle cx="3" cy="8" r="1.45"/><circle cx="9" cy="8" r="1.45"/>' +
          '<circle cx="3" cy="13" r="1.45"/><circle cx="9" cy="13" r="1.45"/>' +
        '</svg>' +
      '</button>' +
      '<div class="job-info">' +
        '<div class="job-line"><span class="job-ref">Job ' + ref + '</span>' + marker + '</div>' +
        '<div class="job-customer" title="' + escapeHtml(job.customer) + '">' + escapeHtml(job.customer) + '</div>' +
        '<div class="job-detail">' + escapeHtml(job.detail) + '</div>' +
      '</div>' +
    '</article>';
  }

  function renderCards(ids, zone) {
    if (!ids.length) {
      const message = zone === "unsequenced"
        ? "Drop here to make a job unsequenced"
        : zone === "unallocated"
          ? "Drop here to unallocate a job"
          : "Drop here to sequence a job";
      return '<div class="empty-zone">' + message + '</div>';
    }
    return ids.map(function (id, index) { return renderCard(id, zone, index); }).join("");
  }

  function renderUnallocated() {
    return '<div class="trip-column unallocated-column">' +
      '<div class="column-header">' +
        '<div class="column-heading-line"><span class="column-name">Unallocated</span>' +
          '<span class="column-count">' + state.unallocated.length + ' jobs</span></div>' +
        '<div class="unallocated-description">Jobs awaiting allocation to a Trip</div>' +
      '</div>' +
      '<div class="unallocated-body drop-zone" data-trip="" data-zone="unallocated">' +
        '<div class="job-list">' + renderCards(state.unallocated, "unallocated") + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderTrip(trip) {
    const total = trip.unsequenced.length + trip.sequenced.length;
    const vehicle = trip.vehicle
      ? escapeHtml(trip.vehicle)
      : '<span class="column-meta-empty">Not assigned</span>';
    const driver = trip.driver
      ? escapeHtml(trip.driver)
      : '<span class="column-meta-empty">Not assigned</span>';
    return '<div class="trip-column">' +
      '<div class="column-header">' +
        '<div class="column-heading-line"><span class="column-name">' + escapeHtml(trip.name) + '</span>' +
          '<span class="column-count">' + total + ' jobs</span></div>' +
        '<div class="column-meta"><span class="meta-label">Vehicle:</span> ' + vehicle + '</div>' +
        '<div class="column-meta"><span class="meta-label">Driver:</span> ' + driver + '</div>' +
      '</div>' +
      '<div class="unsequenced-block">' +
        '<div class="zone-heading"><span>Unsequenced</span><span class="zone-count">' +
           trip.unsequenced.length + '</span></div>' +
        '<div class="job-list unsequenced-list drop-zone" data-trip="' + escapeHtml(trip.id) +
          '" data-zone="unsequenced">' + renderCards(trip.unsequenced, "unsequenced") + '</div>' +
      '</div>' +
      '<div class="sequence-block">' +
        '<div class="sequence-heading">Sequenced · ' + trip.sequenced.length + '</div>' +
        '<div class="job-list sequence-list drop-zone" data-trip="' + escapeHtml(trip.id) +
          '" data-zone="sequenced">' + renderCards(trip.sequenced, "sequenced") + '</div>' +
      '</div>' +
    '</div>';
  }

  function updateSummary() {
    const unsequenced = state.trips.reduce(function (n, t) { return n + t.unsequenced.length; }, 0);
    const jobs = Object.keys(state.jobs).length;
    summary.innerHTML =
      '<span class="summary-item"><strong>' + jobs + '</strong> jobs today</span>' +
      '<span class="summary-dot"></span>' +
      '<span class="summary-item"><strong>' + state.trips.length + '</strong> trips</span>' +
      '<span class="summary-dot"></span>' +
      '<span class="summary-item"><strong>' + state.unallocated.length + '</strong> unallocated</span>' +
      '<span class="summary-dot"></span>' +
      '<span class="summary-item"><strong>' + unsequenced + '</strong> unsequenced</span>';
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
  }

  function renderBoard() {
    const left = scroller.scrollLeft;
    const top = scroller.scrollTop;
    board.innerHTML = renderUnallocated() + state.trips.map(renderTrip).join("");
    updateSummary();
    scroller.scrollLeft = left;
    scroller.scrollTop = top;
  }

  function showToast(title, detail) {
    clearTimeout(toastTimeout);
    toastElement.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(detail) + '</span>';
    toastElement.hidden = false;
    toastTimeout = setTimeout(function () { toastElement.hidden = true; }, 3500);
  }

  function clearDropIndicators() {
    board.querySelectorAll(".drop-before, .drop-after, .drop-active, .dragging-source").forEach(function (node) {
      node.classList.remove("drop-before", "drop-after", "drop-active", "dragging-source");
    });
  }

  function acceptMove(jobId, tripId, zone, anchorId, insertAfter) {
    const from = findJob(jobId);
    const target = getList(tripId, zone);
    if (!from || !target) return;

    const before = getPlacement();
    const source = getList(from.tripId, from.zone);
    source.splice(from.index, 1);
    let index = target.length;
    if (anchorId && anchorId !== jobId) {
      const anchorIndex = target.indexOf(anchorId);
      if (anchorIndex !== -1) index = anchorIndex + (insertAfter ? 1 : 0);
    } else if (anchorId === jobId && from.tripId === tripId && from.zone === zone) {
      // Dropping a job onto itself should leave it where it was.
      index = Math.min(from.index, target.length);
    }
    target.splice(index, 0, jobId);

    const after = getPlacement();
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    undoStack.push({ before: before, after: after, jobId: jobId });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    persistPlacement();
    renderBoard();
    showToast("Job moved", "Job " + state.jobs[jobId].reference + " → " + describeLocation(findJob(jobId)));
  }

  board.addEventListener("dragstart", function (event) {
    const handle = event.target.closest(".drag-handle");
    if (!handle) {
      event.preventDefault();
      return;
    }
    const card = handle.closest(".job-card");
    if (!card || !state.jobs[card.dataset.jobId]) return;
    draggingJobId = card.dataset.jobId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggingJobId);
    if (event.dataTransfer.setDragImage) {
      event.dataTransfer.setDragImage(card, 18, 20);
    }
    requestAnimationFrame(function () {
      if (card.isConnected) card.classList.add("dragging-source");
    });
  });

  board.addEventListener("dragover", function (event) {
    if (!draggingJobId) return;
    const zone = event.target.closest(".drop-zone");
    if (!zone) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDropIndicators();
    const card = event.target.closest(".job-card");
    if (card && zone.contains(card) && card.dataset.jobId !== draggingJobId) {
      const rect = card.getBoundingClientRect();
      card.classList.add(event.clientY < rect.top + rect.height / 2 ? "drop-before" : "drop-after");
    } else {
      zone.classList.add("drop-active");
    }
    const sourceCard = board.querySelector('.job-card[data-job-id="' + draggingJobId + '"]');
    if (sourceCard) sourceCard.classList.add("dragging-source");
  });

  board.addEventListener("drop", function (event) {
    const zone = event.target.closest(".drop-zone");
    if (!draggingJobId || !zone) return;
    event.preventDefault();
    const card = event.target.closest(".job-card");
    let anchorId = null;
    let insertAfter = false;
    if (card && zone.contains(card)) {
      anchorId = card.dataset.jobId;
      const rect = card.getBoundingClientRect();
      insertAfter = event.clientY >= rect.top + rect.height / 2;
    }
    const jobId = draggingJobId;
    draggingJobId = null;
    clearDropIndicators();
    acceptMove(jobId, zone.dataset.trip, zone.dataset.zone, anchorId, insertAfter);
  });

  board.addEventListener("dragend", function () {
    draggingJobId = null;
    clearDropIndicators();
  });

  function restoreHistory(entry, placement, action) {
    applyPlacement(placement);
    persistPlacement();
    renderBoard();
    const job = state.jobs[entry.jobId];
    showToast(action, "Job " + job.reference + " → " + describeLocation(findJob(entry.jobId)));
  }

  function undo() {
    if (!undoStack.length) return;
    const entry = undoStack.pop();
    redoStack.push(entry);
    restoreHistory(entry, entry.before, "Change undone");
  }

  function redo() {
    if (!redoStack.length) return;
    const entry = redoStack.pop();
    undoStack.push(entry);
    restoreHistory(entry, entry.after, "Change redone");
  }

  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);
  document.getElementById("reset").addEventListener("click", function () {
    if (!window.confirm("Reset the Day Board to its original sample Jobs and sequences? This clears Undo/Redo history.")) return;
    state = window.DayBoardData.makeInitialState();
    undoStack = [];
    redoStack = [];
    persistPlacement();
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
    renderBoard();
    showToast("Sample data reset", "All Jobs returned to their starting positions.");
  });

  document.addEventListener("keydown", function (event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    } else if (key === "y") {
      event.preventDefault();
      redo();
    }
  });

  readSavedPlacement();
  renderBoard();
}());
