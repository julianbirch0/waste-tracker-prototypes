/* WasteTracker Day Board V00036 — Leaflet / OpenStreetMap prototype.
   Demo Job points are illustrative, NOT geocoded customer addresses.
   Main Groups & Trips controls the grid and the available map choices;
   this map controls its own plotted dated Trips only. */
(function () {
  "use strict";

  const UNALLOCATED = "unallocated";
  const ORANGE = "#d79542";
  // Route colours are allocated in map-filter order to the trips that are
  // ACTUALLY displayed. Unticking a trip frees its colour for the next one.
  // Orange is reserved for Unallocated Jobs.
  const ROUTE_PALETTE = [
    "#245BCE", // 1 - Blue
    "#D13A3E", // 2 - Red
    "#208650", // 3 - Green
    "#8149B5", // 4 - Purple
    "#B42D80", // 5 - Magenta
    "#137F96", // 6 - Teal
    "#986322", // 7 - Brown
    "#6675A9", // 8 - Slate blue
    "#797B2B", // 9 - Olive
    "#A44C69", // 10 - Rose
    "#356C89", // 11 - Steel blue
    "#735B49"  // 12 - Umber
  ];
  const workspace = document.getElementById("map-workspace");
  const frame = document.querySelector(".board-frame");
  const scroller = document.getElementById("board-scroll");
  const toggleButton = document.getElementById("toggle-map");
  const mapElement = document.getElementById("day-map");
  const filterButton = document.getElementById("map-filter-button");
  const filterPanel = document.getElementById("map-filter-panel");
  const filterWrap = document.getElementById("map-filter-wrap");
  const jobTotal = document.getElementById("map-job-total");
  const fitButton = document.getElementById("map-fit");
  let bridge = null;
  let opened = false;
  let leaflet = null;
  let pinsLayer = null;
  let routesLayer = null;
  let selectedOnMap = new Set();
  let previousEligible = new Set();
  let initialisedSelection = false;
  let closeTimer = null;
  let resizeTimer = null;
  let selectedMarkers = new Map();
  let lastPinPositions = [];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function state() { return bridge.getState(); }
  function eligibleTrips() {
    const byId = new Map(state().trips.map(function (trip) { return [trip.id, trip]; }));
    return bridge.getDisplayTripIds().map(function (id) { return byId.get(id); }).filter(Boolean);
  }
  // Match the visual order of the Show on Map checkboxes: Group, Round, Date.
  // This deliberately does NOT depend on the Day Board's date-first sort mode.
  function orderedMapTrips() {
    const eligible = eligibleTrips();
    const ordered = [];
    state().groups.forEach(function (group) {
      const inGroup = eligible.filter(function (trip) { return trip.groupId === group.id; });
      const seen = new Set();
      inGroup.forEach(function (trip) {
        if (seen.has(trip.roundId)) return;
        seen.add(trip.roundId);
        ordered.push.apply(ordered, inGroup
          .filter(function (item) { return item.roundId === trip.roundId; })
          .sort(function (a, b) { return a.date.localeCompare(b.date); }));
      });
    });
    return ordered;
  }
  function assignedRouteColours() {
    const colours = new Map();
    let colourIndex = 0;
    orderedMapTrips().forEach(function (trip) {
      if (!selectedOnMap.has(trip.id)) return;
      colours.set(trip.id, ROUTE_PALETTE[colourIndex % ROUTE_PALETTE.length]);
      colourIndex += 1;
    });
    return colours;
  }
  function colourForTrip(trip) {
    return trip ? assignedRouteColours().get(trip.id) || null : null;
  }
  function reconcileSelection() {
    const eligible = eligibleTrips();
    const ids = new Set(eligible.map(function (trip) { return trip.id; }));
    if (!initialisedSelection) {
      selectedOnMap = new Set(ids);
      initialisedSelection = true;
    } else {
      const oldRounds = new Map();
      state().trips.forEach(function (trip) {
        if (!previousEligible.has(trip.id)) return;
        const entry = oldRounds.get(trip.roundId) || { total: 0, selected: 0 };
        entry.total += 1;
        if (selectedOnMap.has(trip.id)) entry.selected += 1;
        oldRounds.set(trip.roundId, entry);
      });
      const next = new Set();
      eligible.forEach(function (trip) {
        if (previousEligible.has(trip.id)) {
          if (selectedOnMap.has(trip.id)) next.add(trip.id);
        } else {
          const old = oldRounds.get(trip.roundId);
          // New dates inherit the parent Round's previous selection, but
          // existing individually deselected dates remain deselected.
          if (!old || (old.total > 0 && old.selected === old.total)) next.add(trip.id);
        }
      });
      selectedOnMap = next;
    }
    previousEligible = ids;
  }
  function selectIds(ids, checked) {
    ids.forEach(function (id) {
      if (checked) selectedOnMap.add(id);
      else selectedOnMap.delete(id);
    });
  }
  function checkboxMarkup(level, key, checked, name, colour, count) {
    return '<label class="map-filter-row map-filter-' + level + '">' +
      '<input type="checkbox" data-map-level="' + level + '" data-map-key="' + escapeHtml(key) +
      '"' + (checked ? ' checked' : '') + ' aria-label="Show on map: ' + escapeHtml(name) + '">' +
      // Only dated Trip rows receive a route colour; their colour disappears
      // when unticked. Parent Groups and Rounds are not individual routes.
      (level === 'date'
        ? '<i class="map-filter-swatch' + (colour ? '' : ' map-filter-swatch-empty') +
          '"' + (colour ? ' style="background:' + colour + '"' : '') +
          ' aria-hidden="true"></i>'
        : '') +
      '<span class="map-filter-name">' + escapeHtml(name) + '</span>' +
      (count == null ? '' : '<small>' + count + '</small>') +
      '</label>';
  }
  function renderFilter() {
    if (!opened) return;
    const eligible = eligibleTrips();
    const allIds = eligible.map(function (trip) { return trip.id; });
    const selectedCount = allIds.filter(function (id) { return selectedOnMap.has(id); }).length;
    const routeColours = assignedRouteColours();
    const scroll = filterPanel.querySelector(".map-filter-items");
    const oldScroll = scroll ? scroll.scrollTop : 0;
    filterButton.innerHTML = '<span>Show on Map: ' +
      (selectedCount === allIds.length ? 'All' : selectedCount + ' of ' + allIds.length) +
      '</span><span aria-hidden="true" class="group-filter-chevron">▾</span>';
    const groups = state().groups.map(function (group) {
      const inGroup = eligible.filter(function (trip) { return trip.groupId === group.id; });
      if (!inGroup.length) return '';
      const groupChecked = inGroup.every(function (trip) { return selectedOnMap.has(trip.id); });
      const seen = new Set();
      const rounds = inGroup.filter(function (trip) {
        if (seen.has(trip.roundId)) return false;
        seen.add(trip.roundId);
        return true;
      });
      return '<section class="map-filter-group">' +
        checkboxMarkup('group', group.id, groupChecked, group.name,
          null,
          inGroup.filter(function (trip) { return selectedOnMap.has(trip.id); }).length +
            '/' + inGroup.length) +
        rounds.map(function (round) {
          const dated = inGroup.filter(function (trip) { return trip.roundId === round.roundId; })
            .sort(function (a, b) { return a.date.localeCompare(b.date); });
          const roundChecked = dated.every(function (trip) { return selectedOnMap.has(trip.id); });
          return '<div class="map-filter-round-block">' +
            checkboxMarkup('round', round.roundId, roundChecked, round.name,
              null,
              dated.filter(function (trip) { return selectedOnMap.has(trip.id); }).length +
                '/' + dated.length) +
            dated.map(function (trip) {
              return checkboxMarkup('date', trip.id, selectedOnMap.has(trip.id),
                bridge.formatTripDate(trip.date), routeColours.get(trip.id) || null, null);
            }).join('') +
          '</div>';
        }).join('') +
      '</section>';
    }).join('');
    filterPanel.innerHTML =
      '<label class="group-filter-select-all"><input type="checkbox" data-map-level="all"' +
      (selectedCount === allIds.length ? ' checked' : '') +
      '><span>Select All</span></label>' +
      '<div class="group-filter-divider"></div>' +
      '<div class="map-filter-items">' +
      (groups || '<div class="map-filter-empty">No Trips available from the main filter.</div>') +
      '</div>' +
      '<div class="group-filter-hint">' +
        (selectedCount > ROUTE_PALETTE.length
          ? selectedCount + ' Trips plotted. Colours repeat after ' + ROUTE_PALETTE.length +
            '; narrow your map selection for clarity. '
          : '') +
        'Map choices only. The Day Board grid is unaffected.</div>';
    const newScroll = filterPanel.querySelector(".map-filter-items");
    if (newScroll) newScroll.scrollTop = oldScroll;
    const master = filterPanel.querySelector('input[data-map-level="all"]');
    if (master) master.indeterminate = selectedCount > 0 && selectedCount < allIds.length;
    filterPanel.querySelectorAll('input[data-map-level="group"]').forEach(function (input) {
      const members = eligible.filter(function (trip) { return trip.groupId === input.dataset.mapKey; });
      const count = members.filter(function (trip) { return selectedOnMap.has(trip.id); }).length;
      input.indeterminate = count > 0 && count < members.length;
    });
    filterPanel.querySelectorAll('input[data-map-level="round"]').forEach(function (input) {
      const members = eligible.filter(function (trip) { return trip.roundId === input.dataset.mapKey; });
      const count = members.filter(function (trip) { return selectedOnMap.has(trip.id); }).length;
      input.indeterminate = count > 0 && count < members.length;
    });
  }
  function setFilterOpen(show) {
    filterPanel.hidden = !show;
    filterButton.setAttribute("aria-expanded", String(show));
  }

  // Sample coordinates in V00032 are only an invented 1100 x 720 layout.
  // Project them onto a Swindon-area basemap. Real latitude/longitude
  // fields, when available, take precedence without changing the map code.
  function latLng(job, trip) {
    if (Number.isFinite(job.latitude) && Number.isFinite(job.longitude)) {
      return [job.latitude, job.longitude];
    }
    if (Number.isFinite(job.lat) && Number.isFinite(job.lng)) {
      return [job.lat, job.lng];
    }
    const baseLat = 51.625 - Number(job.mapY == null ? 360 : job.mapY) * 0.00018;
    const baseLng = -1.970 + Number(job.mapX == null ? 550 : job.mapX) * 0.00035;
    // Each mock date repeats the same invented stops. A small, consistent
    // date offset keeps overlapping demo markers/routes separately visible.
    if (!trip || !trip.date) return [baseLat, baseLng];
    const serial = Math.floor(Date.parse(trip.date + "T12:00:00Z") / 86400000);
    const angle = (serial % 9) * Math.PI * 2 / 9;
    return [baseLat + Math.sin(angle) * 0.0010,
      baseLng + Math.cos(angle) * 0.0015];
  }
  function initialiseMap() {
    if (leaflet) return true;
    // OpenStreetMap's volunteer raster server blocks file:// requests without
    // a Referer header. OpenFreeMap's vector tiles require no key/account and
    // can be rendered inside Leaflet via the MapLibre GL Leaflet adapter.
    if (!window.L || !window.maplibregl || !window.L.maplibreGL) {
      mapElement.innerHTML = '<div class="map-offline">' +
        'Interactive map libraries could not be loaded. Check your internet connection, ' +
        'then reopen this page.' +
        '</div>';
      return false;
    }
    leaflet = window.L.map(mapElement, {
      center: [51.56, -1.78], zoom: 11, minZoom: 5, maxZoom: 18,
      zoomControl: true, scrollWheelZoom: true, preferCanvas: true
    });
    const baseLayer = window.L.maplibreGL({
      style: "https://tiles.openfreemap.org/styles/positron",
      attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · ' +
        '<a href="https://openmaptiles.org/">OpenMapTiles</a> · ' +
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leaflet);
    // Errors fetching the style/tiles should be explained in the UI rather
    // than silently producing an empty map.
    if (baseLayer.getMaplibreMap) {
      const vectorMap = baseLayer.getMaplibreMap();
      let styleLoaded = false;
      vectorMap.on("load", function () { styleLoaded = true; });
      vectorMap.on("error", function (event) {
        if (styleLoaded) return;
        console.warn("OpenFreeMap basemap could not load:", event.error || event);
        mapElement.classList.add("map-basemap-error");
        const notice = document.getElementById("map-basemap-notice");
        if (notice) return;
        const warning = document.createElement("div");
        warning.id = "map-basemap-notice";
        warning.className = "map-basemap-notice";
        warning.textContent = "Map background could not load. Check the internet connection or try opening the prototype from a web server.";
        mapElement.appendChild(warning);
      });
    }
    routesLayer = window.L.layerGroup().addTo(leaflet);
    pinsLayer = window.L.layerGroup().addTo(leaflet);
    return true;
  }
  function displayName(trip) {
    return trip.name + (trip.date ? ' · ' + bridge.formatTripDate(trip.date) : '');
  }
  function markerIcon(kind, sequence, colour, chosen) {
    const cls = kind === UNALLOCATED ? 'wt-pin-unallocated' :
      (kind === 'unsequenced' ? 'wt-pin-unsequenced' : 'wt-pin-sequenced');
    const html = '<div class="wt-pin ' + cls +
      (chosen ? ' wt-pin-selected' : '') + '" style="--pin-colour:' + colour + '">' +
      (kind === 'sequenced' ? '<span>' + String(sequence).padStart(2, '0') + '</span>' :
        (kind === 'unsequenced' ? '<span class="wt-pin-core"></span>' :
          '<span class="wt-pin-core"></span>')) + '</div>';
    return window.L.divIcon({
      html: html, className: "wt-leaflet-marker",
      iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
    });
  }
  function markerForJob(jobId, kind, seq, colour, trip) {
    const job = state().jobs[jobId];
    if (!job) return;
    const point = latLng(job, trip);
    lastPinPositions.push(point);
    const chosen = bridge.getSelectedIds().includes(jobId);
    const marker = window.L.marker(point, {
      icon: markerIcon(kind, seq, colour, chosen),
      keyboard: true,
      title: 'Job ' + job.reference + ': ' + job.customer
    });
    const description = trip ? displayName(trip) +
      (kind === 'sequenced' ? ' · ' + String(seq).padStart(2, '0') : ' · Unsequenced')
      : 'Unallocated';
    marker.bindPopup(
      '<div class="wt-job-popup"><strong>Job ' + escapeHtml(job.reference) + '</strong>' +
      '<span>' + escapeHtml(job.customer) + '</span>' +
      '<span>' + escapeHtml(job.detail) + '</span>' +
      '<small>' + escapeHtml(description) + '</small></div>'
    );
    marker.on("click", function () {
      // The grid contains every main-filtered Trip even if horizontally hidden.
      bridge.selectJob(jobId);
      bridge.scrollToJob(jobId);
    });
    marker.addTo(pinsLayer);
    selectedMarkers.set(jobId, { marker: marker, kind: kind, seq: seq, colour: colour });
  }
  function draw() {
    if (!opened || !leaflet) return;
    pinsLayer.clearLayers();
    routesLayer.clearLayers();
    selectedMarkers.clear();
    lastPinPositions = [];
    const current = state();
    current.unallocated.forEach(function (jobId) {
      markerForJob(jobId, UNALLOCATED, 0, ORANGE, null);
    });
    const routeColours = assignedRouteColours();
    current.trips.forEach(function (trip) {
      const colour = routeColours.get(trip.id);
      if (!colour) return;
      const route = trip.sequenced.map(function (jobId) {
        return current.jobs[jobId] ? latLng(current.jobs[jobId], trip) : null;
      }).filter(Boolean);
      if (route.length > 1) window.L.polyline(route, {
        color: colour, weight: 3.5, opacity: 0.73, interactive: false
      }).addTo(routesLayer);
      trip.unsequenced.forEach(function (jobId) {
        markerForJob(jobId, 'unsequenced', 0, colour, trip);
      });
      trip.sequenced.forEach(function (jobId, i) {
        markerForJob(jobId, 'sequenced', i + 1, colour, trip);
      });
    });
    const count = lastPinPositions.length;
    jobTotal.textContent = count + (count === 1 ? ' location' : ' locations');
  }
  function fitAll() {
    if (!leaflet || !opened) return;
    leaflet.invalidateSize({ animate: false });
    if (lastPinPositions.length) {
      leaflet.fitBounds(window.L.latLngBounds(lastPinPositions).pad(0.15), { maxZoom: 14, animate: false });
    } else leaflet.setView([51.56, -1.78], 11, { animate: false });
  }
  function updateWidth() {
    if (!opened) return;
    const width = parseFloat(window.getComputedStyle(frame).getPropertyValue("--trip-width")) || 278;
    const compact = !state().unallocated.length;
    const foldedWidth = parseFloat(window.getComputedStyle(frame).getPropertyValue("--empty-unallocated-width")) || 46;
    const columnWidth = compact ? foldedWidth : width;
    // Up to THREE Trip columns, plus the permanently sticky Unallocated rail.
    // All other Trip columns remain rendered inside a horizontally scrolling grid.
    const ideal = columnWidth + 3 * width + 18;
    const available = Math.max(320, frame.clientWidth - 510);
    frame.style.setProperty("--grid-pane-width", Math.min(ideal, available) + "px");
  }
  function openMap() {
    if (opened) return;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    opened = true;
    workspace.hidden = false;
    workspace.classList.remove("is-closing", "is-opening");
    void workspace.offsetWidth;
    workspace.classList.add("is-opening");
    frame.classList.add("map-mode");
    toggleButton.textContent = "Hide map";
    toggleButton.setAttribute("aria-expanded", "true");
    reconcileSelection();
    updateWidth();
    bridge.renderBoard();
    renderFilter();
    if (initialiseMap()) {
      draw();
      window.requestAnimationFrame(function () {
        if (!opened) return;
        leaflet.invalidateSize({ animate: false });
        fitAll();
      });
    }
  }
  function hideMap() {
    if (!opened) return;
    opened = false;
    setFilterOpen(false);
    frame.classList.remove("map-mode", "map-no-grid");
    workspace.classList.remove("is-opening");
    workspace.classList.add("is-closing");
    toggleButton.textContent = "Show map";
    toggleButton.setAttribute("aria-expanded", "false");
    bridge.renderBoard();
    closeTimer = window.setTimeout(function () {
      if (!opened) {
        workspace.hidden = true;
        workspace.classList.remove("is-closing");
      }
      closeTimer = null;
    }, 350);
  }
  function bind(connected) {
    bridge = connected;
    toggleButton.addEventListener("click", function () {
      if (opened) hideMap(); else openMap();
    });
    filterButton.addEventListener("click", function () {
      if (!opened) return;
      setFilterOpen(filterPanel.hidden);
    });
    filterPanel.addEventListener("change", function (event) {
      const input = event.target.closest('input[data-map-level]');
      if (!input || !opened) return;
      const level = input.dataset.mapLevel, key = input.dataset.mapKey;
      const eligible = eligibleTrips();
      const choices = level === 'all' ? eligible :
        eligible.filter(function (trip) {
          return level === 'group' ? trip.groupId === key :
            (level === 'round' ? trip.roundId === key : trip.id === key);
        });
      selectIds(choices.map(function (trip) { return trip.id; }), input.checked);
      renderFilter();
      draw();
      fitAll();
    });
    document.addEventListener("pointerdown", function (event) {
      if (!filterPanel.hidden && !filterWrap.contains(event.target)) setFilterOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !filterPanel.hidden) setFilterOpen(false);
    });
    fitButton.addEventListener("click", fitAll);
    window.addEventListener("resize", function () {
      if (!opened) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!opened) return;
        updateWidth();
        if (leaflet) leaflet.invalidateSize({ animate: false });
      }, 120);
    });
  }
  window.DayBoardMap = {
    bind: bind,
    isOpen: function () { return opened; },
    hideMap: hideMap,
    visibleColumns: function () { return null; },
    colourForTrip: colourForTrip,
    onGroupsChange: function () {
      if (opened) {
        reconcileSelection();
        renderFilter();
        draw();
      }
    },
    onBoardChange: function () {
      if (!opened) return;
      const oldIds = Array.from(previousEligible).sort().join("|");
      reconcileSelection();
      const eligibilityChanged = oldIds !== Array.from(previousEligible).sort().join("|");
      updateWidth();
      renderFilter();
      draw();
      if (leaflet) window.requestAnimationFrame(function () {
        if (!opened) return;
        leaflet.invalidateSize({ animate: false });
        // A genuine filter/date change can move the selected Trips; a
        // simple Job reorder must not override the user's manual pan/zoom.
        if (eligibilityChanged) fitAll();
      });
    },
    onSelectionChange: function () {
      if (!opened || !leaflet) return;
      const selected = new Set(bridge.getSelectedIds());
      selectedMarkers.forEach(function (detail, id) {
        detail.marker.setIcon(markerIcon(detail.kind, detail.seq, detail.colour, selected.has(id)));
      });
    },
    fitAll: fitAll
  };
}());
