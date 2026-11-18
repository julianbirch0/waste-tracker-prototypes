/* WasteTracker Day Board V00020 — standalone illustrative map.
   No tiles, API keys, map SDK, network requests, or server are needed. */
(function () {
  "use strict";

  const W = 1100, H = 720;
  const LIMIT = 4;
  const UNALLOCATED = "unallocated";
  const COLOURS = [
    "#1f998a", "#5378c9", "#9673b5", "#bb697b", "#b28944", "#558ea6",
    "#7b9154", "#b16d45", "#568a78", "#7d84c7", "#bd6e92", "#6b9cba"
  ];
  const ORANGE = "#d79542";

  const workspace = document.getElementById("map-workspace");
  const frame = document.querySelector(".board-frame");
  const toggleButton = document.getElementById("toggle-map");
  const svg = document.getElementById("day-map");
  const stage = document.getElementById("day-map-stage");
  const layers = document.getElementById("map-layer-list");
  const jobTotal = document.getElementById("map-job-total");
  const capCaption = document.getElementById("grid-cap-caption");
  const popup = document.getElementById("map-popup");

  let bridge = null;
  let opened = false;
  let gridColumns = [];
  let visibleOnMap = new Set();
  let view = { x: 0, y: 0, w: W, h: H };
  let panning = null;
  let suppressMarkerClick = false;
  let closeTimer = null;
  let resizeTimer = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (s) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
  }

  function getState() { return bridge.getState(); }
  function allColumns() {
    return [{ id: UNALLOCATED, name: "Unallocated", jobs: getState().unallocated.length }]
      .concat(getState().trips.map(function (trip) {
        return {
          id: trip.id,
          name: bridge.isRangeView() && trip.date
            ? trip.name + " · " + bridge.formatTripDate(trip.date) : trip.name,
          jobs: trip.unsequenced.length + trip.sequenced.length
        };
      }));
  }
  function columnColour(id) {
    if (id === UNALLOCATED) return ORANGE;
    const index = getState().trips.findIndex(function (trip) { return trip.id === id; });
    return COLOURS[Math.max(index, 0) % COLOURS.length];
  }
  function htmlTick(col, kind, checked, disabled) {
    return '<label class="layer-tick" title="' + escapeHtml((kind === "map" ? "Show on map: " : "Show in grid: ") + col.name) + '">' +
      '<input type="checkbox" data-kind="' + kind + '" data-key="' + escapeHtml(col.id) +
      '" aria-label="' + escapeHtml((kind === "map" ? "Show on map: " : "Show in grid: ") + col.name) +
      '"' + (checked ? " checked" : "") + (disabled ? " disabled" : "") + '>' +
      '<span aria-hidden="true"></span></label>';
  }

  function layerRow(col) {
    const inGrid = gridColumns.includes(col.id);
    const onMap = visibleOnMap.has(col.id);
    const reachedLimit = gridColumns.length >= LIMIT;
    return '<div class="layer-row">' +
      '<div class="layer-title"><i class="layer-swatch" style="background:' +
        columnColour(col.id) + '"></i>' +
        '<span title="' + escapeHtml(col.name) + '">' + escapeHtml(col.name) + '</span>' +
        '<small>' + col.jobs + '</small></div>' +
      htmlTick(col, "map", onMap, false) +
      htmlTick(col, "grid", inGrid, reachedLimit && !inGrid) +
    '</div>';
  }

  function renderLayers() {
    if (!opened) return;
    const state = getState();
    const columns = allColumns();
    const expanded = new Set(bridge.getVisibleGroupIds());
    const previousScroll = layers.scrollTop;
    const unallocated = '<div class="layer-ungrouped">' +
      layerRow(columns[0]) + '</div>';
    const grouped = state.groups.map(function (group) {
      const isExpanded = expanded.has(group.id);
      const groupTrips = state.trips.filter(function (trip) {
        return trip.groupId === group.id;
      });
      const groupCols = groupTrips.map(function (trip) {
        return columns.find(function (col) { return col.id === trip.id; });
      }).filter(Boolean);
      const mapped = groupCols.filter(function (col) {
        return visibleOnMap.has(col.id);
      }).length;
      return '<section class="layer-group">' +
        '<button type="button" class="layer-group-toggle' +
            (isExpanded ? ' is-expanded' : '') +
            '" data-toggle-group="' + escapeHtml(group.id) +
            '" aria-expanded="' + isExpanded +
            '" aria-controls="map-group-' + escapeHtml(group.id) + '">' +
          '<span class="layer-group-chevron" aria-hidden="true">›</span>' +
          '<strong>' + escapeHtml(group.name) + '</strong>' +
          '<small>' + groupCols.length + ' trips' +
          (mapped ? ' · ' + mapped + ' on map' : '') + '</small>' +
        '</button>' +
        '<div class="layer-group-children" id="map-group-' + escapeHtml(group.id) +
          '"' + (isExpanded ? '' : ' hidden') + '>' +
          groupCols.map(layerRow).join("") +
        '</div>' +
      '</section>';
    }).join("");
    layers.innerHTML = unallocated + grouped;
    layers.scrollTop = previousScroll;
    const reachedLimit = gridColumns.length >= LIMIT;
    capCaption.textContent = gridColumns.length + " of " + LIMIT +
      " grid columns selected" + (reachedLimit ? " · Limit reached" : "");
    capCaption.classList.toggle("at-limit", reachedLimit);
  }

  function updateWidth() {
    // Each grid column keeps exactly its normal width; no squeezing.
    // Allow for the board's permanently reserved vertical scrollbar.
    const columnWidth = parseFloat(window.getComputedStyle(frame).getPropertyValue("--trip-width")) || 278;
    frame.style.setProperty("--grid-pane-width", (columnWidth * gridColumns.length + 18) + "px");
    frame.classList.toggle("map-no-grid", opened && gridColumns.length === 0);
  }

  function openMap() {
    if (opened) return;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    const state = getState();
    // Initialise from the full board's Group AND Trip selection. The
    // map's independent Map/Grid tick boxes take over once it's open.
    const tripById = new Map(state.trips.map(function (trip) { return [trip.id, trip]; }));
    const eligibleTrips = bridge.getDisplayTripIds().map(function (id) {
      return tripById.get(id);
    }).filter(Boolean);
    gridColumns = state.unallocated.length && bridge.isUnallocatedSelected()
      ? [UNALLOCATED].concat(eligibleTrips.slice(0, 1).map(function (trip) { return trip.id; }))
      : eligibleTrips.slice(0, 2).map(function (trip) { return trip.id; });
    visibleOnMap = new Set(gridColumns);
    opened = true;
    workspace.hidden = false;
    workspace.classList.remove("is-closing", "is-opening");
    // Restart the slide animation on every opening.
    void workspace.offsetWidth;
    workspace.classList.add("is-opening");
    frame.classList.add("map-mode");
    toggleButton.textContent = "Hide map";
    toggleButton.setAttribute("aria-expanded", "true");
    updateWidth();
    bridge.renderBoard();
    renderLayers();
    draw();
    fitAll();
    // The map has its final dimensions before the slide starts. One fit
    // is enough, and avoids overwriting manual pan/zoom during the slower
    // entrance animation.
  }

  function hideMap() {
    if (!opened) return;
    opened = false;
    frame.classList.remove("map-mode", "map-no-grid");
    workspace.classList.remove("is-opening");
    workspace.classList.add("is-closing");
    toggleButton.textContent = "Show map";
    toggleButton.setAttribute("aria-expanded", "false");
    hidePopup();
    bridge.renderBoard();
    closeTimer = window.setTimeout(function () {
      if (!opened) {
        workspace.hidden = true;
        workspace.classList.remove("is-closing");
      }
      closeTimer = null;
    }, 350);
  }

  function toggleMap() {
    if (opened) hideMap(); else openMap();
  }

  function chosenJobs() {
    if (!opened) return [];
    const state = getState();
    const result = [];
    if (visibleOnMap.has(UNALLOCATED)) {
      state.unallocated.forEach(function (id) {
        result.push({ id: id, x: state.jobs[id].mapX, y: state.jobs[id].mapY, kind: UNALLOCATED, seq: 0, colour: ORANGE });
      });
    }
    state.trips.forEach(function (trip) {
      if (!visibleOnMap.has(trip.id)) return;
      const colour = columnColour(trip.id);
      trip.unsequenced.forEach(function (id) {
        result.push({ id: id, x: state.jobs[id].mapX, y: state.jobs[id].mapY, kind: "unsequenced", seq: 0, colour: colour, tripId: trip.id });
      });
      trip.sequenced.forEach(function (id, i) {
        result.push({ id: id, x: state.jobs[id].mapX, y: state.jobs[id].mapY, kind: "sequenced", seq: i + 1, colour: colour, tripId: trip.id });
      });
    });
    return result;
  }

  function baseMapMarkup() {
    const minorRoads = [];
    for (let i = 0; i < 10; i++) {
      const x = 60 + i * 110;
      minorRoads.push('<path d="M ' + x + ' -20 L ' + (x - 65) +
        ' 740" />');
    }
    for (let j = 0; j < 8; j++) {
      const y = 52 + j * 95;
      minorRoads.push('<path d="M -20 ' + y + ' Q 450 ' + (y - 23) +
        ' 1120 ' + (y + 22) + '" />');
    }
    return '<defs>' +
      '<pattern id="blocks" width="40" height="40" patternUnits="userSpaceOnUse">' +
        '<rect x="8" y="7" width="18" height="13" rx="2" fill="#e8efed"/>' +
        '<rect x="27" y="24" width="9" height="11" rx="1" fill="#e9efed"/>' +
      '</pattern>' +
      '</defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="#f2f7f6"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#blocks)" opacity=".85"/>' +
      '<path d="M 0 400 Q 155 340 270 395 T 610 350 T 900 395 T 1100 345 L1100 450 Q 920 490 810 440 T 520 430 T 230 475 T0 460Z" fill="#e1eee1"/>' +
      '<path d="M 90 120 L 295 58 420 130 385 268 220 260 120 200Z" fill="#d9e9d8"/>' +
      '<path d="M 780 75 L 1050 110 1080 290 900 312 815 220Z" fill="#deecdd"/>' +
      '<path d="M 170 565 L 385 512 455 676 225 700Z" fill="#dfeddc"/>' +
      '<path d="M -35 525 C 180 485 245 625 480 568 S 820 498 1135 604" fill="none" stroke="#cee6eb" stroke-width="29"/>' +
      '<path d="M -35 525 C 180 485 245 625 480 568 S 820 498 1135 604" fill="none" stroke="#e8f7fa" stroke-width="15"/>' +
      '<g fill="none" stroke="#fff" stroke-width="12" opacity=".98">' +
        minorRoads.join("") +
      '</g>' +
      '<g fill="none" stroke="#dce7e8" stroke-width="1.2" opacity=".72">' +
        minorRoads.join("") +
      '</g>' +
      '<path d="M -30 325 Q 355 245 580 280 T 1130 215" fill="none" stroke="#d5dde0" stroke-width="29"/>' +
      '<path d="M -30 325 Q 355 245 580 280 T 1130 215" fill="none" stroke="#fff" stroke-width="23"/>' +
      '<path d="M 325 -20 C 400 160 510 345 475 745" fill="none" stroke="#d5dde0" stroke-width="26"/>' +
      '<path d="M 325 -20 C 400 160 510 345 475 745" fill="none" stroke="#fff" stroke-width="20"/>' +
      '<path d="M 40 90 Q 520 120 990 660" fill="none" stroke="#e4d5c2" stroke-width="9"/>' +
      '<path d="M 40 90 Q 520 120 990 660" fill="none" stroke="#fff" stroke-width="5"/>' +
      '<g class="map-place-label">' +
        '<text x="135" y="155">WEST PARK</text>' +
        '<text x="838" y="164">NORTH QUARTER</text>' +
        '<text x="630" y="380">CENTRAL</text>' +
        '<text x="156" y="632">RIVERSIDE</text>' +
        '<text x="825" y="661">EAST INDUSTRIAL</text>' +
      '</g>' +
      '<g class="map-road-label"><text x="570" y="256">EAST–WEST LINK</text><text x="498" y="495" transform="rotate(-79 498 495)">CENTRAL AVENUE</text></g>';
  }

  function markerMarkup(item, selected) {
    const state = getState();
    const job = state.jobs[item.id];
    const label = 'Job ' + job.reference + (item.seq ? ', sequence ' + item.seq : '') +
      ', ' + job.customer;
    const common = '<g class="job-marker' + (selected ? ' is-marker-selected' : '') +
      '" data-job-id="' + item.id + '" role="button" tabindex="0" aria-label="' +
      escapeHtml(label) + '" transform="translate(' + item.x + ',' + item.y + ')">';
    if (item.kind === UNALLOCATED) {
      return common + '<circle r="12" fill="' + ORANGE + '" stroke="white" stroke-width="3"/>' +
        '<circle r="3" fill="white"/></g>';
    }
    if (item.kind === "unsequenced") {
      return common + '<circle r="13" fill="white" stroke="' + item.colour +
        '" stroke-width="4" stroke-dasharray="4 3"/>' +
        '<circle r="4" fill="' + item.colour + '"/></g>';
    }
    return common + '<circle r="15" fill="' + item.colour + '" stroke="white" stroke-width="3"/>' +
      '<text text-anchor="middle" dominant-baseline="central" fill="white" font-size="11.5" font-weight="700">' +
      String(item.seq).padStart(2, "0") + '</text></g>';
  }

  function draw() {
    if (!opened) return;
    const state = getState();
    const selected = new Set(bridge.getSelectedIds());
    const routes = [];
    state.trips.forEach(function (trip) {
      if (!visibleOnMap.has(trip.id) || trip.sequenced.length < 2) return;
      const pts = trip.sequenced.map(function (id) {
        const job = state.jobs[id];
        return job.mapX + "," + job.mapY;
      });
      routes.push('<polyline class="map-route" points="' + pts.join(" ") +
        '" stroke="' + columnColour(trip.id) + '"/>');
    });
    const pins = chosenJobs();
    svg.innerHTML = baseMapMarkup() +
      '<g class="map-routes">' + routes.join("") + '</g>' +
      '<g class="map-markers">' + pins.map(function (item) {
        return markerMarkup(item, selected.has(item.id));
      }).join("") + '</g>' +
      (!pins.length ? '<text class="map-empty" x="550" y="340" text-anchor="middle">Select a Trip to show its locations</text>' : '');
    jobTotal.textContent = pins.length + (pins.length === 1 ? " location" : " locations");
    applyView();
    renderLayers();
  }

  function applyView() {
    svg.setAttribute("viewBox",
      [view.x, view.y, view.w, view.h].map(function (n) { return Math.round(n * 100) / 100; }).join(" "));
  }

  function fitAll() {
    if (!opened) return;
    const pins = chosenJobs();
    if (!pins.length) {
      view = { x: 0, y: 0, w: W, h: H };
      applyView();
      return;
    }
    const xs = pins.map(function (p) { return p.x; });
    const ys = pins.map(function (p) { return p.y; });
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    const screenRatio = Math.max(stage.clientWidth, 1) / Math.max(stage.clientHeight, 1);
    let width = Math.max(220, maxX - minX + 130);
    let height = Math.max(165, maxY - minY + 130);
    if (width / height < screenRatio) width = height * screenRatio;
    else height = width / screenRatio;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    view = { x: cx - width / 2, y: cy - height / 2, w: width, h: height };
    applyView();
  }

  function zoom(factor, anchorX, anchorY) {
    if (!opened) return;
    const fx = anchorX == null ? 0.5 : anchorX;
    const fy = anchorY == null ? 0.5 : anchorY;
    const targetW = Math.min(2500, Math.max(105, view.w / factor));
    const multiplier = targetW / view.w;
    const nextH = view.h * multiplier;
    view = {
      x: view.x + fx * (view.w - targetW),
      y: view.y + fy * (view.h - nextH),
      w: targetW,
      h: nextH
    };
    applyView();
  }

  function hidePopup() { popup.hidden = true; }

  function findLocation(jobId) {
    const state = getState();
    if (state.unallocated.includes(jobId)) return { column: UNALLOCATED, status: "Unallocated" };
    for (const trip of state.trips) {
      const unseq = trip.unsequenced.indexOf(jobId);
      if (unseq !== -1) return { column: trip.id, status: trip.name + " · Unsequenced" };
      const seq = trip.sequenced.indexOf(jobId);
      if (seq !== -1) return { column: trip.id, status: trip.name + " · " + String(seq + 1).padStart(2, "0") };
    }
    return null;
  }

  function showJobPopup(jobId, x, y) {
    const job = getState().jobs[jobId];
    const location = findLocation(jobId);
    if (!job || !location) return;
    popup.innerHTML = '<button type="button" class="map-popup-close" aria-label="Close Job details">×</button>' +
      '<strong>Job ' + escapeHtml(job.reference) + '</strong>' +
      '<span class="map-popup-location">' + escapeHtml(location.status) + '</span>' +
      '<span>' + escapeHtml(job.customer) + '</span>' +
      '<span>' + escapeHtml(job.detail) + '</span>';
    const bounds = stage.getBoundingClientRect();
    popup.style.left = Math.max(9, Math.min(x - bounds.left + 8, Math.max(9, bounds.width - 243))) + "px";
    popup.style.top = Math.max(9, Math.min(y - bounds.top + 8, Math.max(9, bounds.height - 140))) + "px";
    popup.hidden = false;
  }

  function selectMarker(jobId, x, y) {
    const location = findLocation(jobId);
    if (!location) return;
    if (gridColumns.includes(location.column)) {
      hidePopup();
      bridge.selectJob(jobId);
      bridge.scrollToJob(jobId);
    } else {
      showJobPopup(jobId, x, y);
    }
  }

  function bind(connected) {
    bridge = connected;
    toggleButton.addEventListener("click", toggleMap);

    layers.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-toggle-group]");
      if (!button || !opened) return;
      bridge.toggleGroup(button.dataset.toggleGroup,
        button.getAttribute("aria-expanded") !== "true");
    });

    layers.addEventListener("change", function (event) {
      const input = event.target.closest('input[type="checkbox"][data-key]');
      if (!input || !opened) return;
      const key = input.dataset.key, kind = input.dataset.kind;
      if (!allColumns().some(function (column) { return column.id === key; })) return;
      hidePopup();
      if (kind === "map") {
        if (input.checked) visibleOnMap.add(key);
        else visibleOnMap.delete(key);
        draw();
        fitAll();
        return;
      }
      if (kind === "grid") {
        if (input.checked) {
          if (gridColumns.length >= LIMIT) {
            input.checked = false;
            renderLayers();
            return;
          }
          gridColumns.push(key);
        } else {
          gridColumns = gridColumns.filter(function (id) { return id !== key; });
        }
        updateWidth();
        bridge.renderBoard();
        // A width change changes the SVG's aspect ratio: fit again.
        window.requestAnimationFrame(function () { if (opened) fitAll(); });
      }
    });

    document.getElementById("map-zoom-in").addEventListener("click", function () { zoom(1.32); });
    document.getElementById("map-zoom-out").addEventListener("click", function () { zoom(1 / 1.32); });
    document.getElementById("map-fit").addEventListener("click", fitAll);
    popup.addEventListener("click", function (event) {
      if (event.target.closest(".map-popup-close")) hidePopup();
    });

    svg.addEventListener("click", function (event) {
      if (suppressMarkerClick) return;
      const marker = event.target.closest(".job-marker");
      if (marker && marker.dataset.jobId) {
        event.preventDefault();
        selectMarker(marker.dataset.jobId, event.clientX, event.clientY);
      } else hidePopup();
    });
    svg.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const marker = event.target.closest(".job-marker");
      if (!marker) return;
      event.preventDefault();
      const rect = marker.getBoundingClientRect();
      selectMarker(marker.dataset.jobId, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    svg.addEventListener("wheel", function (event) {
      if (!opened) return;
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (event.clientY - rect.top) / Math.max(rect.height, 1);
      zoom(event.deltaY < 0 ? 1.16 : 1 / 1.16, x, y);
    }, { passive: false });

    svg.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest(".job-marker")) return;
      panning = { id: event.pointerId, x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y, moved: false };
      if (svg.setPointerCapture) svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", function (event) {
      if (!panning || event.pointerId !== panning.id) return;
      const rect = svg.getBoundingClientRect();
      const dx = event.clientX - panning.x, dy = event.clientY - panning.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panning.moved = true;
      view.x = panning.viewX - dx * view.w / Math.max(rect.width, 1);
      view.y = panning.viewY - dy * view.h / Math.max(rect.height, 1);
      applyView();
    });
    const endPan = function (event) {
      if (!panning || event.pointerId !== panning.id) return;
      if (panning.moved) {
        suppressMarkerClick = true;
        window.setTimeout(function () { suppressMarkerClick = false; }, 0);
      }
      panning = null;
    };
    svg.addEventListener("pointerup", endPan);
    svg.addEventListener("pointercancel", endPan);

    window.addEventListener("resize", function () {
      if (!opened) return;
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (opened) fitAll();
      }, 140);
    });
  }

  window.DayBoardMap = {
    bind: bind,
    isOpen: function () { return opened; },
    hideMap: hideMap,
    visibleColumns: function () { return opened ? gridColumns.slice() : null; },
    onBoardChange: function () { if (opened) draw(); },
    onGroupsChange: function () { if (opened) renderLayers(); },
    onSelectionChange: function () {
      if (!opened) return;
      const selected = new Set(bridge.getSelectedIds());
      svg.querySelectorAll(".job-marker").forEach(function (marker) {
        marker.classList.toggle("is-marker-selected", selected.has(marker.dataset.jobId));
      });
    },
    fitAll: fitAll
  };
}());
