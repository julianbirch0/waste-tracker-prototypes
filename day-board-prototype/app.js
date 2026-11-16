/* WasteTracker Day Board V00002
   Standalone, file:// compatible. Custom pointer drag-and-drop; no dependencies. */
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
  let pendingDrag = null;
  let activeDrag = null;
  let targetFrame = 0;
  let latestPointer = null;
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
      '<button type="button" class="drag-handle" ' +
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

  // Pointer-driven dragging replaces native HTML drag-and-drop. The actual
  // Job card is lifted into a fixed overlay, while a real-sized slot is
  // inserted into the live column. The other cards reflow around that slot.
  const DRAG_THRESHOLD_PX = 5;
  const SLOT_HYSTERESIS_PX = 6;
  const SHIFT_DURATION_MS = 175;

  function acceptMove(jobId, tripId, zone, targetIndex) {
    const from = findJob(jobId);
    const target = getList(tripId, zone);
    if (!from || !target) return false;

    const before = getPlacement();
    const source = getList(from.tripId, from.zone);
    source.splice(from.index, 1);
    const index = Math.max(0, Math.min(targetIndex, target.length));
    target.splice(index, 0, jobId);

    const after = getPlacement();
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    undoStack.push({ before: before, after: after, jobId: jobId });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    persistPlacement();
    return true;
  }

  function findDropZone(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const zone = element.closest(".drop-zone");
    return zone && board.contains(zone) ? zone : null;
  }

  function hostForZone(zone) {
    return zone.classList.contains("job-list")
      ? zone
      : zone.querySelector(".job-list");  // Unallocated has a nested list.
  }

  function jobCards(host) {
    return Array.from(host.children).filter(function (child) {
      return child.classList.contains("job-card");
    });
  }

  function placeholderIndex(host, placeholder) {
    const slots = Array.from(host.children).filter(function (child) {
      return child.classList.contains("job-card") ||
             child.classList.contains("job-placeholder");
    });
    return slots.indexOf(placeholder);
  }

  function cardMidpoint(card) {
    const rect = card.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }

  function moveFloat(drag, x, y) {
    const left = x - drag.gripOffsetX;
    const top = y - drag.gripOffsetY;
    drag.floating.style.transform =
      "translate3d(" + left + "px," + top + "px,0)";
  }

  function beginPointerDrag(event) {
    const pending = pendingDrag;
    if (!pending || activeDrag) return;
    const card = pending.card;
    if (!card.isConnected) return;

    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.className = "job-placeholder";
    placeholder.style.height = rect.height + "px";
    placeholder.setAttribute("aria-hidden", "true");

    const host = card.parentElement;
    const zone = host.closest(".drop-zone");
    host.insertBefore(placeholder, card);

    const floating = document.createElement("div");
    floating.className = "floating-job";
    floating.style.width = rect.width + "px";
    floating.style.height = rect.height + "px";
    document.body.appendChild(floating);
    floating.appendChild(card);

    const drag = {
      jobId: pending.jobId,
      floating: floating,
      placeholder: placeholder,
      zone: zone,
      gripOffsetX: pending.startX - rect.left,
      gripOffsetY: pending.startY - rect.top
    };
    activeDrag = drag;
    zone.classList.add("has-placeholder", "is-targeted");
    document.body.classList.add("is-pointer-dragging");
    moveFloat(drag, event.clientX, event.clientY);
  }

  function animateDisplacedCards(previousHost, nextHost, performMove) {
    const nodes = new Set(jobCards(previousHost).concat(jobCards(nextHost)));
    const before = new Map();
    nodes.forEach(function (node) {
      before.set(node, node.getBoundingClientRect());
      if (node.getAnimations) {
        node.getAnimations().forEach(function (animation) { animation.cancel(); });
      }
    });
    performMove();

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    nodes.forEach(function (node) {
      if (!node.isConnected || !node.animate) return;
      const old = before.get(node);
      const current = node.getBoundingClientRect();
      const distance = old.top - current.top;
      if (Math.abs(distance) > 1) {
        node.animate([
          { transform: "translateY(" + distance + "px)" },
          { transform: "translateY(0)" }
        ], {
          duration: SHIFT_DURATION_MS,
          easing: "cubic-bezier(.2,.75,.2,1)"
        });
      }
    });
  }

  function placeSlot(x, y) {
    const drag = activeDrag;
    if (!drag) return null;
    const zone = findDropZone(x, y);
    if (!zone) {
      drag.zone.classList.remove("is-targeted");
      return null;
    }
    const host = hostForZone(zone);
    if (!host) return null;

    const currentHost = drag.placeholder.parentElement;
    const sameHost = currentHost === host;
    const cards = jobCards(host);
    let targetIndex;

    if (sameHost) {
      // Direction-sensitive midpoint crossing: the cards either side of
      // the gap are different, avoiding a jittery flip-flop at boundaries.
      targetIndex = placeholderIndex(host, drag.placeholder);
      while (targetIndex < cards.length &&
             y > cardMidpoint(cards[targetIndex]) + SLOT_HYSTERESIS_PX) {
        targetIndex += 1;
      }
      while (targetIndex > 0 &&
             y < cardMidpoint(cards[targetIndex - 1]) - SLOT_HYSTERESIS_PX) {
        targetIndex -= 1;
      }
      if (targetIndex === placeholderIndex(host, drag.placeholder)) {
        zone.classList.add("is-targeted");
        return zone;
      }
    } else {
      // A newly entered column gets a gap next to the nearest Job.
      targetIndex = cards.findIndex(function (card) { return y < cardMidpoint(card); });
      if (targetIndex < 0) targetIndex = cards.length;
    }

    const oldZone = drag.zone;
    const beforeCard = cards[targetIndex] || null;
    animateDisplacedCards(currentHost, host, function () {
      if (oldZone !== zone) {
        oldZone.classList.remove("has-placeholder", "is-targeted");
      }
      host.insertBefore(drag.placeholder, beforeCard);
      zone.classList.add("has-placeholder", "is-targeted");
      drag.zone = zone;
    });
    return zone;
  }

  function scheduleSlotPosition(x, y) {
    latestPointer = { x: x, y: y };
    if (targetFrame) return;
    // Frame-throttled instead of a long debounce: immediate feedback,
    // without updating the DOM multiple times per display refresh.
    targetFrame = window.requestAnimationFrame(function () {
      targetFrame = 0;
      if (!activeDrag || !latestPointer) return;
      placeSlot(latestPointer.x, latestPointer.y);
    });
  }

  function releaseFloatingCard(drag) {
    // After rendering the committed/cancelled placement, fly the lifted
    // card the final few pixels into its resting position.
    const settledCard = board.querySelector('.job-card[data-job-id="' + drag.jobId + '"]');
    if (!settledCard) {
      drag.floating.remove();
      return;
    }
    const rect = settledCard.getBoundingClientRect();
    drag.floating.classList.add("is-settling");
    drag.floating.style.transform =
      "translate3d(" + rect.left + "px," + rect.top + "px,0)";
    window.setTimeout(function () { drag.floating.remove(); }, 150);
  }

  function completePointerDrag(shouldCommit) {
    const drag = activeDrag;
    pendingDrag = null;
    latestPointer = null;
    if (targetFrame) {
      window.cancelAnimationFrame(targetFrame);
      targetFrame = 0;
    }
    if (!drag) return;
    activeDrag = null;
    document.body.classList.remove("is-pointer-dragging");

    let moved = false;
    if (shouldCommit) {
      const host = drag.placeholder.parentElement;
      const position = placeholderIndex(host, drag.placeholder);
      if (position >= 0) {
        moved = acceptMove(drag.jobId, drag.zone.dataset.trip,
          drag.zone.dataset.zone, position);
      }
    }
    drag.zone.classList.remove("has-placeholder", "is-targeted");
    renderBoard();
    releaseFloatingCard(drag);
    if (moved) {
      showToast("Job moved", "Job " + state.jobs[drag.jobId].reference +
        " → " + describeLocation(findJob(drag.jobId)));
    }
  }

  board.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || pendingDrag || activeDrag) return;
    const handle = event.target.closest(".drag-handle");
    if (!handle) return;
    const card = handle.closest(".job-card");
    if (!card || !state.jobs[card.dataset.jobId]) return;
    const rect = card.getBoundingClientRect();
    pendingDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      card: card,
      jobId: card.dataset.jobId
    };
    // Prevent text selection, browser drag ghosts and touch scrolling on the handle.
    event.preventDefault();
  });

  document.addEventListener("pointermove", function (event) {
    if (!pendingDrag || event.pointerId !== pendingDrag.pointerId) return;
    if (!activeDrag) {
      const dx = event.clientX - pendingDrag.startX;
      const dy = event.clientY - pendingDrag.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      beginPointerDrag(event);
    }
    if (!activeDrag) return;
    moveFloat(activeDrag, event.clientX, event.clientY);
    scheduleSlotPosition(event.clientX, event.clientY);
    event.preventDefault();
  }, { passive: false });

  document.addEventListener("pointerup", function (event) {
    if (!pendingDrag || event.pointerId !== pendingDrag.pointerId) return;
    if (!activeDrag) {
      pendingDrag = null;
      return;
    }
    moveFloat(activeDrag, event.clientX, event.clientY);
    const validZone = placeSlot(event.clientX, event.clientY);
    completePointerDrag(Boolean(validZone));
    event.preventDefault();
  });

  document.addEventListener("pointercancel", function (event) {
    if (!pendingDrag || event.pointerId !== pendingDrag.pointerId) return;
    completePointerDrag(false);
  });

  window.addEventListener("blur", function () {
    if (pendingDrag) completePointerDrag(false);
  });

  // No native drag/drop: the floating card is always rendered at full opacity.
  board.addEventListener("dragstart", function (event) { event.preventDefault(); });

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
    if (event.key === "Escape" && pendingDrag) {
      event.preventDefault();
      completePointerDrag(false);
      return;
    }
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
