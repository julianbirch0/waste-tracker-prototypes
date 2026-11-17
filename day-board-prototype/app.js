/* WasteTracker Day Board V00008
   Standalone, file:// compatible. Custom pointer drag-and-drop; no dependencies. */
(function () {
  "use strict";

  // A fresh local key presents V00008's intentionally re-planned sample routes,
  // rather than carrying over arbitrary Job positions from earlier demos.
  const STORAGE_KEY = "wastetracker.dayboard.v00008.placements";
  const MAX_HISTORY = 100;
  const board = document.getElementById("board");
  const scroller = document.getElementById("board-scroll");
  const undoButton = document.getElementById("undo");
  const redoButton = document.getElementById("redo");
  const summary = document.getElementById("board-summary");
  const toastElement = document.getElementById("toast");
  const groupFilterWrap = document.getElementById("group-filter-wrap");
  const groupFilterButton = document.getElementById("group-filter-button");
  const groupFilterPanel = document.getElementById("group-filter-panel");
  const groups = window.DayBoardData.groups || [];
  let visibleGroupIds = new Set(groups.map(function (group) { return group.id; }));

  let state = window.DayBoardData.makeInitialState();
  let undoStack = [];
  let redoStack = [];
  let selectedJobIds = new Set();
  let selectionAnchorId = null;
  let pendingDrag = null;
  let activeDrag = null;
  let targetFrame = 0;
  let scrollFrame = 0;
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
    const isSelected = selectedJobIds.has(jobId);
    return '<article class="job-card' + (isSelected ? ' is-selected' : '') +
      '" data-job-id="' + escapeHtml(jobId) +
      '" role="button" tabindex="0" aria-pressed="' + isSelected +
      '" aria-label="Job ' + ref + (isSelected ? ', selected. Drag to move' : ', click to select') + '">' +
      '<div class="job-info">' +
        '<div class="job-line"><span class="job-ref">Job ' + ref + '</span>' +
        '<span class="job-labels"><span class="job-status job-status-planned">' +
        escapeHtml(job.status || "planned") + '</span>' + marker + '</span></div>' +
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
    return '<div class="trip-column" data-group-id="' + escapeHtml(trip.groupId) +
      '" title="' + escapeHtml((groups.find(function (group) { return group.id === trip.groupId; }) || {}).name || "") + '">' +
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
    const mapColumns = window.DayBoardMap && window.DayBoardMap.visibleColumns();
    if (mapColumns) {
      // Map mode renders only chosen columns, including an optional
      // Unallocated column. Their order follows the user's checkbox choices.
      board.innerHTML = mapColumns.map(function (id) {
        if (id === "unallocated") return renderUnallocated();
        const trip = getTrip(id);
        return trip ? renderTrip(trip) : "";
      }).join("");
    } else {
      // The full board shows only Trips in the chosen/expanded groups.
      // Unallocated remains the sticky first column even for "Nothing".
      board.innerHTML = renderUnallocated() + state.trips.filter(function (trip) {
        return visibleGroupIds.has(trip.groupId);
      }).map(renderTrip).join("");
    }
    updateSummary();
    scroller.scrollLeft = left;
    scroller.scrollTop = top;
    if (window.DayBoardMap) window.DayBoardMap.onBoardChange();
  }

  function groupSelectionText() {
    if (visibleGroupIds.size === groups.length) return "All groups";
    if (!visibleGroupIds.size) return "Nothing";
    if (visibleGroupIds.size === 1) {
      const selected = groups.find(function (group) { return visibleGroupIds.has(group.id); });
      return selected ? selected.name : "1 group";
    }
    return visibleGroupIds.size + " groups";
  }

  function renderGroupFilter() {
    groupFilterButton.innerHTML = escapeHtml(groupSelectionText()) +
      ' <span aria-hidden="true" class="group-filter-chevron">▾</span>';
    groupFilterPanel.innerHTML =
      '<div class="group-filter-actions">' +
        '<button type="button" data-group-action="all">All</button>' +
        '<button type="button" data-group-action="rest">All the Rest</button>' +
        '<button type="button" data-group-action="nothing">Nothing</button>' +
      '</div>' +
      '<div class="group-filter-options">' + groups.map(function (group) {
        return '<label class="group-filter-option"><input type="checkbox" data-group-option="' +
          escapeHtml(group.id) + '"' + (visibleGroupIds.has(group.id) ? ' checked' : '') +
          '><span>' + escapeHtml(group.name) + '</span>' +
          '<small>' + state.trips.filter(function (trip) {
            return trip.groupId === group.id;
          }).length + '</small></label>';
      }).join("") + '</div>' +
      '<div class="group-filter-hint">Expanded groups appear in the full Day Board.</div>';
  }

  function chooseGroups(ids) {
    const valid = new Set(groups.map(function (group) { return group.id; }));
    visibleGroupIds = new Set(ids.filter(function (id) { return valid.has(id); }));
    renderGroupFilter();
    if (window.DayBoardMap && window.DayBoardMap.isOpen()) {
      // Accordion expansion is independent of Map/Grid checkbox choices.
      window.DayBoardMap.onGroupsChange();
    } else {
      const left = scroller.scrollLeft;
      renderBoard();
      // Do not retain a huge horizontal offset when most columns disappear.
      scroller.scrollLeft = Math.min(left, scroller.scrollWidth - scroller.clientWidth);
    }
  }

  function toggleGroup(groupId, expanded) {
    const ids = new Set(visibleGroupIds);
    if (expanded) ids.add(groupId); else ids.delete(groupId);
    chooseGroups(Array.from(ids));
  }

  function closeGroupFilter() {
    groupFilterPanel.hidden = true;
    groupFilterButton.setAttribute("aria-expanded", "false");
  }

  groupFilterButton.addEventListener("click", function () {
    const show = groupFilterPanel.hidden;
    groupFilterPanel.hidden = !show;
    groupFilterButton.setAttribute("aria-expanded", String(show));
  });
  groupFilterPanel.addEventListener("click", function (event) {
    const quick = event.target.closest("button[data-group-action]");
    if (!quick) return;
    const action = quick.dataset.groupAction;
    const current = new Set(visibleGroupIds);
    if (action === "all") {
      chooseGroups(groups.map(function (group) { return group.id; }));
    } else if (action === "rest") {
      chooseGroups(groups.filter(function (group) {
        return !current.has(group.id);
      }).map(function (group) { return group.id; }));
    } else if (action === "nothing") {
      chooseGroups([]);
    }
  });
  groupFilterPanel.addEventListener("change", function (event) {
    const input = event.target.closest('input[data-group-option]');
    if (!input) return;
    toggleGroup(input.dataset.groupOption, input.checked);
  });
  document.addEventListener("pointerdown", function (event) {
    if (!groupFilterPanel.hidden && !groupFilterWrap.contains(event.target)) {
      closeGroupFilter();
    }
  });

  function showToast(title, detail) {
    clearTimeout(toastTimeout);
    toastElement.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(detail) + '</span>';
    toastElement.hidden = false;
    toastTimeout = setTimeout(function () { toastElement.hidden = true; }, 3500);
  }

  // Selection is always restricted to a single Trip (both sequencing
  // sections count as one column), or to the Unallocated column.
  function selectionColumn(jobId) {
    const location = findJob(jobId);
    if (!location) return null;
    return location.zone === "unallocated" ? "" : location.tripId;
  }

  function columnJobOrder(columnId) {
    if (columnId === "") return state.unallocated.slice();
    const trip = getTrip(columnId);
    return trip ? trip.unsequenced.concat(trip.sequenced) : [];
  }

  function orderedSelection() {
    if (!selectedJobIds.size) return [];
    const first = selectedJobIds.values().next().value;
    return columnJobOrder(selectionColumn(first)).filter(function (id) {
      return selectedJobIds.has(id);
    });
  }

  function setSelectedJobs(ids, anchorId) {
    selectedJobIds = new Set(ids);
    selectionAnchorId = anchorId && selectedJobIds.has(anchorId)
      ? anchorId
      : (ids[0] || null);

    board.querySelectorAll(".job-card").forEach(function (card) {
      const id = card.dataset.jobId;
      const selected = selectedJobIds.has(id);
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
      const job = state.jobs[id];
      if (job) {
        card.setAttribute("aria-label", "Job " + job.reference +
          (selected ? ", selected. Drag to move" : ", click to select"));
      }
    });
    if (window.DayBoardMap) window.DayBoardMap.onSelectionChange();
  }

  function changeSelection(jobId, modifiers) {
    const column = selectionColumn(jobId);
    if (column === null) return;
    const firstSelected = selectedJobIds.values().next().value;
    const existingColumn = firstSelected ? selectionColumn(firstSelected) : null;
    const shift = Boolean(modifiers.shiftKey);
    const ctrl = Boolean(modifiers.ctrlKey || modifiers.metaKey);

    // Modified clicks in another column are intentionally ignored,
    // leaving the existing selection and anchor exactly as they were.
    if ((shift || ctrl) && selectedJobIds.size && column !== existingColumn) return;

    if (shift && selectedJobIds.size && selectionAnchorId) {
      const order = columnJobOrder(column);
      const start = order.indexOf(selectionAnchorId);
      const finish = order.indexOf(jobId);
      if (start !== -1 && finish !== -1) {
        const range = order.slice(Math.min(start, finish), Math.max(start, finish) + 1);
        const ids = ctrl ? Array.from(new Set([...selectedJobIds, ...range])) : range;
        setSelectedJobs(ids, selectionAnchorId);
        return;
      }
    }

    if (ctrl) {
      const next = new Set(selectedJobIds);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      const anchor = next.has(jobId) ? jobId
        : (next.has(selectionAnchorId) ? selectionAnchorId : next.values().next().value);
      setSelectedJobs(Array.from(next), anchor);
      return;
    }

    setSelectedJobs([jobId], jobId);
  }

  // Pointer-driven dragging replaces native HTML drag-and-drop. The actual
  // Job card is lifted into a fixed overlay, while a real-sized slot is
  // inserted into the live column. The other cards reflow around that slot.
  const DRAG_THRESHOLD_PX = 5;
  const SLOT_HYSTERESIS_PX = 6;
  const SHIFT_DURATION_MS = 175;
  const AUTO_SCROLL_EDGE_PX = 70;
  const AUTO_SCROLL_MAX_STEP_PX = 19;

  function acceptMove(jobIds, tripId, zone, targetIndex, grabbedJobId) {
    if (!Array.isArray(jobIds) || !jobIds.length) return false;
    const ids = Array.from(new Set(jobIds));
    const sourceColumn = selectionColumn(ids[0]);
    const target = getList(tripId, zone);
    if (sourceColumn === null || !target ||
        ids.some(function (id) { return selectionColumn(id) !== sourceColumn; })) {
      return false;
    }

    const before = getPlacement();
    const selected = new Set(ids);
    const sourceLists = sourceColumn === ""
      ? [state.unallocated]
      : [getTrip(sourceColumn).unsequenced, getTrip(sourceColumn).sequenced];

    // The DOM placeholder position already ignores lifted cards, so first
    // remove every selected Job from its source list(s), then splice the
    // whole group into that precise index of the destination list.
    sourceLists.forEach(function (list) {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        if (selected.has(list[i])) list.splice(i, 1);
      }
    });
    const index = Math.max(0, Math.min(targetIndex, target.length));
    target.splice(index, 0, ...ids);

    const after = getPlacement();
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    undoStack.push({
      before: before,
      after: after,
      jobIds: ids,
      jobId: grabbedJobId || ids[0]
    });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    persistPlacement();
    return true;
  }

  function moveDescription(ids) {
    if (!ids.length) return "";
    const prefix = ids.length === 1
      ? "Job " + state.jobs[ids[0]].reference
      : ids.length + " Jobs";
    return prefix + " → " + describeLocation(findJob(ids[0]));
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
    const ids = orderedSelection();
    if (!ids.includes(pending.jobId)) return;

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
    floating.setAttribute("aria-hidden", "true");
    document.body.appendChild(floating);

    // Make a tactile stack rather than a tall group or a count badge.
    // Two other selected cards peek out behind the grabbed card.
    if (ids.length > 1) {
      const backingIds = ids.filter(function (id) { return id !== pending.jobId; }).slice(0, 2);
      backingIds.reverse().forEach(function (id, index) {
        const backing = board.querySelector('.job-card[data-job-id="' + id + '"]');
        if (!backing) return;
        const layer = backing.cloneNode(true);
        layer.classList.add("stack-layer");
        layer.style.setProperty("--stack-offset", (backingIds.length - index) * 6 + "px");
        layer.removeAttribute("tabindex");
        layer.removeAttribute("role");
        floating.appendChild(layer);
      });
    }
    floating.appendChild(card);

    // Lift the entire selection out of its original positions. Only one
    // normal-card-sized placeholder remains, even for a large group.
    const idSet = new Set(ids);
    board.querySelectorAll(".job-card").forEach(function (node) {
      if (idSet.has(node.dataset.jobId)) node.remove();
    });

    const drag = {
      jobId: pending.jobId,
      jobIds: ids,
      floating: floating,
      placeholder: placeholder,
      zone: zone,
      gripOffsetX: pending.startX - rect.left,
      gripOffsetY: pending.startY - rect.top,
      sourceZone: zone.dataset.zone,
      sourceTrip: zone.dataset.trip
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

  // Unsequenced remains sticky while the sequenced list scrolls underneath
  // it. A visible Unsequenced heading therefore does not mean the user has
  // reached the beginning of the Trip's sequenced work.
  function mayDropIntoUnsequenced(zone) {
    if (zone.dataset.zone !== "unsequenced" || !activeDrag) return true;
    if (activeDrag.sourceZone === "unsequenced" &&
        activeDrag.sourceTrip === zone.dataset.trip) return true;

    const trip = getTrip(zone.dataset.trip);
    if (!trip || !trip.sequenced.length) return true;
    const firstId = trip.sequenced[0];
    const firstCard = board.querySelector('.job-card[data-job-id="' + firstId + '"]');

    // Sequence 01 may itself be in the floating selection. In that case,
    // the Trip must have genuinely scrolled all the way to the beginning.
    if (!firstCard) {
      return activeDrag.sourceTrip === trip.id &&
        activeDrag.jobIds.includes(firstId) && scroller.scrollTop <= 4;
    }

    const column = zone.closest(".trip-column");
    const sticky = column && column.querySelector(".unsequenced-block");
    const viewport = scroller.getBoundingClientRect();
    const card = firstCard.getBoundingClientRect();
    const visibleTop = sticky
      ? Math.max(viewport.top, sticky.getBoundingClientRect().bottom)
      : viewport.top;
    // Entire first sequenced card must be visible BELOW the sticky area.
    return card.top >= visibleTop - 3 && card.bottom <= viewport.bottom + 3;
  }

  function placeSlot(x, y) {
    const drag = activeDrag;
    if (!drag) return null;
    const zone = findDropZone(x, y);
    if (!zone || !mayDropIntoUnsequenced(zone)) {
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

  // The Day Board has one common vertical scroller. Edge scrolling during
  // dragging moves only scrollTop: scrollLeft is deliberately never advanced.
  // This is active even if the pointer is stationary at the top/bottom.
  function dragScrollVelocity(x, y) {
    const viewport = scroller.getBoundingClientRect();
    if (x < viewport.left || x > viewport.right ||
        y < viewport.top - 48 || y > viewport.bottom + 48) return 0;

    // Find the column from X without relying on the pointer's Y being inside
    // the viewport (it may be just beyond the top or bottom edge).
    const hitY = Math.min(viewport.bottom - 4, Math.max(viewport.top + 4, y));
    const under = document.elementFromPoint(x, hitY);
    const column = under && under.closest(".trip-column");
    if (!column || !board.contains(column)) return 0;

    const sticky = column.querySelector(".unsequenced-block");
    const header = column.querySelector(".column-header");
    const headerBottom = header
      ? header.getBoundingClientRect().bottom
      : viewport.top + 90;
    const stickyBottom = sticky
      ? sticky.getBoundingClientRect().bottom
      : headerBottom;

    // Scrolling upwards starts at the top of the *visible sequenced
    // section*, beneath the pinned Trip header and Unsequenced section.
    const edgeTop = Math.min(viewport.bottom - 85,
      Math.max(viewport.top + 32, stickyBottom)) + AUTO_SCROLL_EDGE_PX;
    const edgeBottom = viewport.bottom - AUTO_SCROLL_EDGE_PX;

    if (y < edgeTop) {
      const strength = Math.min(1, Math.max(0, (edgeTop - y) / AUTO_SCROLL_EDGE_PX));
      return -Math.max(2, Math.round(AUTO_SCROLL_MAX_STEP_PX * strength));
    }
    if (y > edgeBottom) {
      const strength = Math.min(1, Math.max(0, (y - edgeBottom) / AUTO_SCROLL_EDGE_PX));
      return Math.max(2, Math.round(AUTO_SCROLL_MAX_STEP_PX * strength));
    }
    return 0;
  }

  function autoScrollDrag() {
    scrollFrame = 0;
    if (!activeDrag || !latestPointer) return;
    const velocity = dragScrollVelocity(latestPointer.x, latestPointer.y);
    if (!velocity) return;

    const previousTop = scroller.scrollTop;
    const previousLeft = scroller.scrollLeft;
    scroller.scrollTop += velocity;
    // Never pan the columns horizontally as a side effect of a drag.
    if (scroller.scrollLeft !== previousLeft) scroller.scrollLeft = previousLeft;
    if (scroller.scrollTop === previousTop) return;

    // The pointer need not move for the placeholder to keep tracking newly
    // revealed cards as the vertical scroll progresses.
    placeSlot(latestPointer.x, latestPointer.y);
    scrollFrame = window.requestAnimationFrame(autoScrollDrag);
  }

  function scheduleAutoScroll() {
    if (!activeDrag || !latestPointer || scrollFrame) return;
    if (dragScrollVelocity(latestPointer.x, latestPointer.y)) {
      scrollFrame = window.requestAnimationFrame(autoScrollDrag);
    }
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
    if (scrollFrame) {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    }
    if (!drag) return;
    activeDrag = null;
    document.body.classList.remove("is-pointer-dragging");

    let moved = false;
    if (shouldCommit) {
      const host = drag.placeholder.parentElement;
      const position = placeholderIndex(host, drag.placeholder);
      if (position >= 0) {
        moved = acceptMove(drag.jobIds, drag.zone.dataset.trip,
          drag.zone.dataset.zone, position, drag.jobId);
      }
    }
    drag.zone.classList.remove("has-placeholder", "is-targeted");
    renderBoard();
    releaseFloatingCard(drag);
    if (moved) showToast("Jobs moved", moveDescription(drag.jobIds));
  }

  board.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || pendingDrag || activeDrag) return;
    const card = event.target.closest(".job-card");
    if (!card || !board.contains(card)) {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        setSelectedJobs([], null);
      }
      return;
    }
    const jobId = card.dataset.jobId;
    if (!state.jobs[jobId]) return;

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      changeSelection(jobId, event);
      // Modified selection must never trigger dragging in that gesture.
      event.preventDefault();
      return;
    }

    if (!selectedJobIds.has(jobId)) {
      // Select immediately, but arm dragging on this very same press.
      // A short movement threshold distinguishes a click from a drag.
      changeSelection(jobId, event);
    }

    pendingDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      card: card,
      jobId: jobId
    };
    // A single press can lift a new selection; an existing group moves together.
    event.preventDefault();
  });

  board.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".job-card");
    if (!card || !board.contains(card)) return;
    event.preventDefault();
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey &&
        selectedJobIds.has(card.dataset.jobId)) return;
    changeSelection(card.dataset.jobId, event);
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
    scheduleAutoScroll();
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
    const ids = entry.jobIds || [entry.jobId];
    setSelectedJobs(ids, entry.jobId);
    showToast(action, moveDescription(ids));
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
    selectedJobIds = new Set();
    selectionAnchorId = null;
    undoStack = [];
    redoStack = [];
    persistPlacement();
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
    renderBoard();
    showToast("Sample data reset", "All Jobs returned to their starting positions.");
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (!groupFilterPanel.hidden) {
        event.preventDefault();
        closeGroupFilter();
        groupFilterButton.focus();
        return;
      }
      if (pendingDrag) {
        event.preventDefault();
        completePointerDrag(false);
      } else if (selectedJobIds.size) {
        event.preventDefault();
        setSelectedJobs([], null);
      }
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

  function scrollToJobFromMap(jobId) {
    const card = board.querySelector('.job-card[data-job-id="' + jobId + '"]');
    if (!card) return;
    const column = card.closest(".trip-column");
    const header = column && column.querySelector(".column-header");
    const sticky = column && column.querySelector(".unsequenced-block");
    const scrollRect = scroller.getBoundingClientRect();
    const headerHeight = header ? header.getBoundingClientRect().height : 90;
    const stickyHeight = sticky ? sticky.getBoundingClientRect().height : 0;
    const safeTop = scrollRect.top + headerHeight + stickyHeight + 14;
    const safeBottom = scrollRect.bottom - 16;
    const cardRect = card.getBoundingClientRect();

    // Unsequenced markers already point to sticky visible cards.
    if (card.closest(".unsequenced-block")) return;
    let change = 0;
    if (cardRect.top < safeTop) change = cardRect.top - safeTop;
    else if (cardRect.bottom > safeBottom) change = cardRect.bottom - safeBottom;
    if (change) {
      scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + change), behavior: "smooth" });
    }
  }

  readSavedPlacement();
  renderGroupFilter();
  renderBoard();
  if (window.DayBoardMap) {
    window.DayBoardMap.bind({
      getState: function () { return state; },
      getSelectedIds: function () { return Array.from(selectedJobIds); },
      renderBoard: renderBoard,
      getVisibleGroupIds: function () { return Array.from(visibleGroupIds); },
      toggleGroup: toggleGroup,
      selectJob: function (jobId) { setSelectedJobs([jobId], jobId); },
      scrollToJob: scrollToJobFromMap
    });
  }
}());
