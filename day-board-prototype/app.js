/* WasteTracker Day Board V00016
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
  const driverWarnings = document.getElementById("driver-warnings");
  const driverDialogBackdrop = document.getElementById("driver-dialog-backdrop");
  const driverDialog = driverDialogBackdrop.querySelector(".driver-dialog");
  const driverDialogTripName = document.getElementById("driver-dialog-trip-name");
  const driverDialogCurrent = document.getElementById("driver-dialog-current");
  const driverDialogUnassign = document.getElementById("driver-dialog-unassign");
  const driverDialogList = document.getElementById("driver-dialog-list");
  const availableDrivers = (window.DayBoardData.drivers || []).slice().sort(function (a, b) {
    return a.localeCompare(b, "en-GB");
  });
  const vehicleDialogBackdrop = document.getElementById("vehicle-dialog-backdrop");
  const vehicleDialog = vehicleDialogBackdrop.querySelector(".driver-dialog");
  const vehicleDialogTripName = document.getElementById("vehicle-dialog-trip-name");
  const vehicleDialogCurrent = document.getElementById("vehicle-dialog-current");
  const vehicleDialogUnassign = document.getElementById("vehicle-dialog-unassign");
  const vehicleDialogList = document.getElementById("vehicle-dialog-list");
  const availableVehicles = (window.DayBoardData.vehicles || []).slice().sort(function (a, b) {
    return a.localeCompare(b, "en-GB", { numeric: true });
  });
  const groups = window.DayBoardData.groups || [];
  let visibleGroupIds = new Set(groups.map(function (group) { return group.id; }));
  // Group headings select all their children; individual Trips remain
  // independently selectable in the full-grid view.
  let visibleTripIds = null;
  let showUnallocated = true;
  let expandedFilterGroups = new Set(groups.map(function (group) { return group.id; }));
  // An active issue filter is a live view of today's allocations, not a
  // frozen list of Trip IDs. Keep the ordinary selection untouched beneath it.
  let activeWarningFilter = null;
  let savedFilterBeforeWarning = null;

  const DAY_MS = 86400000;
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function isoLocal(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") +
      "-" + String(date.getDate()).padStart(2, "0");
  }

  function fromIso(iso) {
    const parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function addDays(iso, count) {
    const date = fromIso(iso);
    date.setDate(date.getDate() + count);
    return isoLocal(date);
  }

  function dayIndex(iso) { return (fromIso(iso).getDay() + 6) % 7; }

  function shortDate(iso) {
    const date = fromIso(iso);
    return WEEKDAYS[dayIndex(iso)] + ", " + String(date.getDate()).padStart(2, "0") +
      "-" + MONTHS[date.getMonth()];
  }

  function dateLabel(iso) {
    const date = fromIso(iso);
    return String(date.getDate()).padStart(2, "0") + "-" +
      MONTHS[date.getMonth()] + "-" + date.getFullYear();
  }

  function relativeDateDescription(key, reference) {
    const today = reference || todayKey;
    if (key === today) return "Today";
    if (key === addDays(today, -1)) return "Yesterday";
    if (key === addDays(today, 1)) return "Tomorrow";
    const date = fromIso(key);
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday"][date.getDay()];
    const monday = function (iso) { return addDays(iso, -dayIndex(iso)); };
    const dayNumber = function (iso) {
      const d = fromIso(iso);
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
    };
    const weeks = Math.round((dayNumber(monday(key)) - dayNumber(monday(today))) / 7);
    if (weeks === 0) return key > today ? "This " + weekday : weekday + ", this week";
    if (weeks === 1) return "Next " + weekday;
    if (weeks === -1) return weekday + " last week";
    if (weeks > 1) return weekday + " in " + weeks + " weeks";
    return weekday + " " + Math.abs(weeks) + " weeks ago";
  }

  const todayKey = isoLocal(new Date());
  let dateSelection = {
    mode: "single", day: todayKey, start: todayKey, end: todayKey,
    weekdays: [0, 1, 2, 3, 4, 5, 6], order: "round-date",
    source: "preset", preset: "today"
  };
  const dayStore = new Map();
  const dayTemplates = new Map();

  function getTemplate(key) {
    if (!dayTemplates.has(key)) dayTemplates.set(key, window.DayBoardData.makeInitialState(key));
    return dayTemplates.get(key);
  }

  function getDay(key) {
    if (!dayStore.has(key)) dayStore.set(key, window.DayBoardData.makeInitialState(key));
    return dayStore.get(key);
  }

  function jobOrigin(id) { return String(id).slice(-10); }

  function resolveJob(id) {
    const origin = jobOrigin(id);
    return /^\d{4}-\d{2}-\d{2}$/.test(origin) ? getTemplate(origin).jobs[id] : null;
  }

  function datesInSelection() {
    if (dateSelection.mode === "single") return [dateSelection.day];
    const result = [];
    const allowed = new Set(dateSelection.weekdays);
    for (let day = dateSelection.start, n = 0; day <= dateSelection.end && n < 366; day = addDays(day, 1), n += 1) {
      if (allowed.has(dayIndex(day))) result.push(day);
    }
    return result;
  }

  function isRangeView() { return dateSelection.mode === "range"; }

  function buildView() {
    const keys = datesInSelection();
    const days = keys.map(getDay);
    const jobs = {};
    const trips = [];
    const unallocated = [];
    days.forEach(function (day) {
      Object.assign(jobs, day.jobs);
      trips.push.apply(trips, day.trips);
      unallocated.push.apply(unallocated, day.unallocated);
    });
    return { groups: window.DayBoardData.groups, jobs: jobs,
      trips: trips, unallocated: unallocated };
  }

  // Materialise the projection back to the dated records whenever a Job or
  // assignment changes, so edits made across days remain visible on each
  // individual day. Unallocated Jobs remain with their date of origin.
  function commitViewToDays() {
    const keys = datesInSelection();
    keys.forEach(function (key) {
      const day = getDay(key);
      day.trips = state.trips.filter(function (trip) { return trip.date === key; });
      day.unallocated = state.unallocated.filter(function (id) { return jobOrigin(id) === key; });
      const jobs = {};
      const ids = day.unallocated.concat.apply(day.unallocated.slice(),
        day.trips.reduce(function (parts, trip) {
          parts.push(trip.unsequenced, trip.sequenced);
          return parts;
        }, []));
      ids.forEach(function (id) {
        const job = state.jobs[id] || resolveJob(id);
        if (job) jobs[id] = job;
      });
      day.jobs = jobs;
    });
  }

  let state = buildView();
  visibleTripIds = new Set(state.trips.map(function (trip) { return trip.id; }));
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
  let driverDialogTripId = null;
  let draftDrivers = null;
  let vehicleDialogTripId = null;
  let draftVehicles = null;

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

  function getDriverAssignments() {
    const result = {};
    state.trips.forEach(function (trip) { result[trip.id] = trip.driver || ""; });
    return result;
  }

  function driverAssignmentsValid(assignments) {
    if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) return false;
    return state.trips.every(function (trip) {
      return Object.prototype.hasOwnProperty.call(assignments, trip.id) &&
        (assignments[trip.id] === "" || availableDrivers.includes(assignments[trip.id]));
    });
  }

  function applyDriverAssignments(assignments) {
    if (!driverAssignmentsValid(assignments)) return false;
    state.trips.forEach(function (trip) { trip.driver = assignments[trip.id]; });
    return true;
  }

  function getVehicleAssignments() {
    const result = {};
    state.trips.forEach(function (trip) { result[trip.id] = trip.vehicle || ""; });
    return result;
  }

  function vehicleAssignmentsValid(assignments) {
    if (!assignments || typeof assignments !== "object" || Array.isArray(assignments)) return false;
    return state.trips.every(function (trip) {
      return Object.prototype.hasOwnProperty.call(assignments, trip.id) &&
        (assignments[trip.id] === "" || availableVehicles.includes(assignments[trip.id]));
    });
  }

  function applyVehicleAssignments(assignments) {
    if (!vehicleAssignmentsValid(assignments)) return false;
    state.trips.forEach(function (trip) { trip.vehicle = assignments[trip.id]; });
    return true;
  }

  function getHistoryState() {
    return {
      placement: getPlacement(), drivers: getDriverAssignments(),
      vehicles: getVehicleAssignments()
    };
  }

  function applyHistoryState(snapshot) {
    if (!snapshot || !placementIsValid(snapshot.placement) ||
        !driverAssignmentsValid(snapshot.drivers) ||
        !vehicleAssignmentsValid(snapshot.vehicles)) return false;
    applyPlacement(snapshot.placement);
    applyDriverAssignments(snapshot.drivers);
    applyVehicleAssignments(snapshot.vehicles);
    return true;
  }

  function addHistoryEntry(entry) {
    undoStack.push(entry);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  }

  function captureDay(day) {
    return {
      placement: {
        unallocated: day.unallocated.slice(),
        trips: day.trips.map(function (trip) {
          return { id: trip.id, unsequenced: trip.unsequenced.slice(), sequenced: trip.sequenced.slice() };
        })
      },
      drivers: Object.fromEntries(day.trips.map(function (trip) { return [trip.id, trip.driver || ""]; })),
      vehicles: Object.fromEntries(day.trips.map(function (trip) { return [trip.id, trip.vehicle || ""]; }))
    };
  }

  function loadDayRecord(key, record) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !record || !record.placement) return;
    const day = getDay(key), placement = record.placement;
    if (!Array.isArray(placement.trips) || placement.trips.length !== day.trips.length ||
        !Array.isArray(placement.unallocated)) return;
    const ids = placement.unallocated.slice();
    for (let i = 0; i < day.trips.length; i += 1) {
      const row = placement.trips[i];
      if (!row || row.id !== day.trips[i].id ||
          !Array.isArray(row.unsequenced) || !Array.isArray(row.sequenced)) return;
      ids.push.apply(ids, row.unsequenced);
      ids.push.apply(ids, row.sequenced);
    }
    if (new Set(ids).size !== ids.length || ids.some(function (id) { return !resolveJob(id); })) return;
    day.unallocated = placement.unallocated.slice();
    placement.trips.forEach(function (saved, i) {
      const trip = day.trips[i];
      trip.unsequenced = saved.unsequenced.slice();
      trip.sequenced = saved.sequenced.slice();
      if (record.drivers && availableDrivers.includes(record.drivers[trip.id])) trip.driver = record.drivers[trip.id];
      else if (record.drivers && record.drivers[trip.id] === "") trip.driver = "";
      if (record.vehicles && availableVehicles.includes(record.vehicles[trip.id])) trip.vehicle = record.vehicles[trip.id];
      else if (record.vehicles && record.vehicles[trip.id] === "") trip.vehicle = "";
    });
    day.jobs = Object.fromEntries(ids.map(function (id) { return [id, resolveJob(id)]; }));
  }

  function migrateLegacy(parsed) {
    if (!parsed.placement) return;
    // V00013 and earlier were explicitly the sample Trip day Mon 16-Nov.
    // Preserve existing edits on that actual date, not the user's current day.
    const key = "2026-11-16", suffix = "@" + key;
    const placement = parsed.placement;
    if (!Array.isArray(placement.trips) || placement.trips.length !== 12 ||
        !Array.isArray(placement.unallocated)) return;
    const suffixItems = function (list) { return list.map(function (id) { return id + suffix; }); };
    loadDayRecord(key, {
      placement: {
        unallocated: suffixItems(placement.unallocated),
        trips: placement.trips.map(function (row) {
          return {
            id: row.id + suffix,
            unsequenced: suffixItems(row.unsequenced),
            sequenced: suffixItems(row.sequenced)
          };
        })
      },
      drivers: parsed.drivers ? Object.fromEntries(Object.entries(parsed.drivers).map(function (entry) {
        return [entry[0] + suffix, entry[1]];
      })) : null,
      vehicles: parsed.vehicles ? Object.fromEntries(Object.entries(parsed.vehicles).map(function (entry) {
        return [entry[0] + suffix, entry[1]];
      })) : null
    });
  }

  function readSavedPlacement() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.version === 4 && parsed.days && typeof parsed.days === "object") {
        Object.keys(parsed.days).forEach(function (key) {
          loadDayRecord(key, parsed.days[key]);
        });
      } else if ([1, 2, 3].includes(parsed.version)) {
        // Earlier prototype data belongs to its original 16-Nov sample day.
        // Preserve it without accidentally assigning those edits to Today.
        migrateLegacy(parsed);
      }
      state = buildView();
    } catch (error) {
      // Some file:// browser configurations disable localStorage.
    }
  }

  function persistPlacement() {
    try {
      commitViewToDays();
      const days = {};
      dayStore.forEach(function (day, key) { days[key] = captureDay(day); });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, days: days }));
    } catch (error) {
      // All editing and date navigation also work without browser storage.
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
      : '<span class="column-meta-empty">Unassigned</span>';
    const driver = trip.driver
      ? escapeHtml(trip.driver)
      : '<span class="column-meta-empty">Unassigned</span>';
    const group = groups.find(function (item) { return item.id === trip.groupId; });
    return '<div class="trip-column" data-group-id="' + escapeHtml(trip.groupId) + '">' +
      '<div class="column-header">' +
        '<div class="column-heading-line"><span class="column-trip-title">' +
          '<span class="column-name" title="Group: ' +
          escapeHtml(group ? group.name : "Unassigned") + '">' + escapeHtml(trip.name) + '</span>' +
          (isRangeView() && trip.date ?
            '<span class="column-trip-date">' + escapeHtml(shortDate(trip.date)) + '</span>' : '') +
          '</span><span class="column-count">' + total + ' jobs</span></div>' +
        '<div class="column-meta column-driver-meta"><span class="meta-label">Vehicle:</span> ' +
          '<span class="column-driver-name">' + vehicle + '</span>' +
          '<button type="button" class="driver-change-button vehicle-change-button" data-vehicle-trip="' +
            escapeHtml(trip.id) + '" aria-label="Change vehicle for ' +
            escapeHtml(trip.name) + '" title="Change or swap vehicle">⇄</button></div>' +
        '<div class="column-meta column-driver-meta"><span class="meta-label">Driver:</span> ' +
          '<span class="column-driver-name">' + driver + '</span>' +
          '<button type="button" class="driver-change-button" data-driver-trip="' + escapeHtml(trip.id) +
            '" aria-label="Change driver for ' + escapeHtml(trip.name) + '" title="Change or swap driver">⇄</button></div>' +
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
      '<span class="summary-item"><strong>' + jobs + '</strong> ' +
        (isRangeView() ? 'jobs in range' : dateSelection.day === todayKey ? 'jobs today' : 'jobs on day') +
        '</span>' +
      '<span class="summary-dot"></span>' +
      '<span class="summary-item"><strong>' + state.trips.length + '</strong> trips</span>' +
      '<span class="summary-dot"></span>' +
      '<span class="summary-item"><strong>' + state.unallocated.length + '</strong> unallocated</span>' +
      '<span class="summary-dot"></span>' +
      '<span class="summary-item"><strong>' + unsequenced + '</strong> unsequenced</span>';
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
    updateAllocationWarnings();
  }

  // Driver and vehicle warnings use identical rules but independent
  // allocations. The existing driver warning IDs are retained for
  // compatibility with the V00012 filter interaction.
  function warningKindDetails(kind) {
    if (kind === "missing") return { asset: "driver", category: "missing" };
    if (kind === "multiple") return { asset: "driver", category: "multiple" };
    if (kind === "vehicle-missing") return { asset: "vehicle", category: "missing" };
    if (kind === "vehicle-multiple") return { asset: "vehicle", category: "multiple" };
    return null;
  }

  function warningTrips(kind) {
    const details = warningKindDetails(kind);
    if (!details) return [];
    const field = details.asset;
    if (details.category === "missing") {
      return state.trips.filter(function (trip) { return !trip[field]; });
    }
    const counts = new Map();
    state.trips.forEach(function (trip) {
      if (trip[field]) counts.set(trip[field], (counts.get(trip[field]) || 0) + 1);
    });
    return state.trips.filter(function (trip) {
      return trip[field] && (counts.get(trip[field]) || 0) > 1;
    });
  }

  const warningGroupDetails = {
    missing: { title: "Trips with no driver assigned", shortName: "No driver assigned" },
    multiple: { title: "Trips with duplicate driver", shortName: "Duplicate driver" },
    "vehicle-missing": { title: "Trips with no vehicle assigned", shortName: "No vehicle assigned" },
    "vehicle-multiple": { title: "Trips with duplicate vehicle", shortName: "Duplicate vehicle" }
  };
  const warningKinds = ["missing", "multiple", "vehicle-missing", "vehicle-multiple"];

  function sortedWarningTrips(kind) {
    const trips = warningTrips(kind).slice();
    const details = warningKindDetails(kind);
    const compare = function (a, b) {
      return a.localeCompare(b, "en-GB", { sensitivity: "base", numeric: true });
    };
    if (details && details.category === "multiple") {
      const field = details.asset;
      trips.sort(function (a, b) {
        return compare(a[field], b[field]) || compare(a.name, b.name);
      });
    } else {
      trips.sort(function (a, b) { return compare(a.name, b.name); });
    }
    return trips;
  }

  function syncWarningFilter() {
    if (!activeWarningFilter || warningTrips(activeWarningFilter).length) return;
    // Once the last affected Trip is fixed, restore the exact manual
    // selection that was in place before the first warning Show.
    activeWarningFilter = null;
    if (savedFilterBeforeWarning) {
      visibleTripIds = new Set(savedFilterBeforeWarning.tripIds);
      showUnallocated = savedFilterBeforeWarning.unallocated;
      visibleGroupIds = new Set(savedFilterBeforeWarning.groupIds);
    }
    savedFilterBeforeWarning = null;
  }

  function activateWarningFilter(kind) {
    if (!warningGroupDetails[kind] || !warningTrips(kind).length) return;
    if (!activeWarningFilter) {
      savedFilterBeforeWarning = {
        tripIds: Array.from(visibleTripIds),
        unallocated: showUnallocated,
        groupIds: Array.from(visibleGroupIds)
      };
    }
    activeWarningFilter = kind;
    // All affected Trips must fit in the grid, so return from map mode.
    if (window.DayBoardMap && window.DayBoardMap.isOpen()) {
      window.DayBoardMap.hideMap();
    } else {
      renderBoard();
    }
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
  }

  function clearWarningFilterForManualSelection() {
    if (!activeWarningFilter) return false;
    activeWarningFilter = null;
    savedFilterBeforeWarning = null;
    // Explicitly choosing an ordinary group/Trip starts a new selection,
    // rather than unexpectedly re-enabling all the old hidden Trips.
    visibleTripIds = new Set();
    showUnallocated = false;
    visibleGroupIds = new Set();
    return true;
  }

  function updateAllocationWarnings() {
    // A multi-day board naturally has repeat vehicles/drivers across dated
    // instances, so single-day allocation warnings would be misleading.
    if (isRangeView()) {
      driverWarnings.innerHTML = "";
      driverWarnings.hidden = true;
      return;
    }
    const warnings = [];
    [
      { kind: "missing", noun: "driver" },
      { kind: "multiple", noun: "driver" },
      { kind: "vehicle-missing", noun: "vehicle" },
      { kind: "vehicle-multiple", noun: "vehicle" }
    ].forEach(function (setting) {
      const trips = warningTrips(setting.kind);
      if (!trips.length) return;
      const isMultiple = warningKindDetails(setting.kind).category === "multiple";
      const amount = isMultiple
        ? new Set(trips.map(function (trip) { return trip[setting.noun]; })).size
        : trips.length;
      const label = isMultiple
        ? amount + (amount === 1 ? " " + setting.noun + " assigned to multiple trips" :
          " " + setting.noun + "s assigned to multiple trips")
        : amount + (amount === 1 ? " trip with no " + setting.noun + " assigned" :
          " trips with no " + setting.noun + " assigned");
      warnings.push({
        kind: setting.kind,
        label: label,
        hint: warningGroupDetails[setting.kind].title
      });
    });

    driverWarnings.hidden = warnings.length === 0;
    driverWarnings.innerHTML = warnings.map(function (warning) {
      return '<span class="driver-warning">' +
        '<span class="driver-warning-icon" aria-hidden="true">!</span>' +
        '<span class="driver-warning-label">' + escapeHtml(warning.label) + '</span>' +
        '<button type="button" class="driver-warning-show" data-warning-filter="' +
        warning.kind + '" aria-label="Show ' + escapeHtml(warning.hint) +
        '">Show</button></span>';
    }).join("");
  }

  driverWarnings.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-warning-filter]");
    if (!button) return;
    activateWarningFilter(button.dataset.warningFilter);
    closeGroupFilter();
  });

  const MAX_GRID_COLUMNS = 40;
  const columnLimitElement = document.getElementById("date-column-limit");

  function updateColumnLimitNotice() {
    const count = isRangeView() ? displayTripsInOrder().length : 0;
    const limited = count > MAX_GRID_COLUMNS;
    columnLimitElement.textContent = limited
      ? "Only the first 40 columns will be displayed in the grid." : "";
    columnLimitElement.classList.toggle("is-visible", limited);
  }

  function displayTripsInOrder() {
    const trips = activeWarningFilter
      ? sortedWarningTrips(activeWarningFilter)
      : state.trips.filter(function (trip) { return visibleTripIds.has(trip.id); });
    if (isRangeView()) {
      const compare = function (a, b) {
        return a.localeCompare(b, "en-GB", { sensitivity: "base", numeric: true });
      };
      trips.sort(function (a, b) {
        return dateSelection.order === "date-round"
          ? compare(a.date, b.date) || compare(a.name, b.name)
          : compare(a.name, b.name) || compare(a.date, b.date);
      });
    }
    return trips;
  }

  function renderBoard() {
    syncWarningFilter();
    // Warning group memberships and counts respond to driver Save/Undo/Redo.
    // Refresh the selector even when it is currently closed.
    renderGroupFilter();
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
      const shownTrips = displayTripsInOrder().slice(0, MAX_GRID_COLUMNS);
      const showAvailable = !activeWarningFilter && showUnallocated;
      board.innerHTML = (showAvailable ? renderUnallocated() : "") +
        shownTrips.map(renderTrip).join("");
      if (!showAvailable && shownTrips.length === 0) {
        board.innerHTML = '<div class="board-no-columns">No Trips selected. Use Groups and Trips to choose what to display.</div>';
      }
    }
    updateSummary();
    updateColumnLimitNotice();
    scroller.scrollLeft = left;
    scroller.scrollTop = top;
    if (window.DayBoardMap) window.DayBoardMap.onBoardChange();
  }

  function groupSelectionText() {
    if (activeWarningFilter) return warningGroupDetails[activeWarningFilter].shortName;
    if (showUnallocated && visibleTripIds.size === state.trips.length) return "All";
    if (!showUnallocated && !visibleTripIds.size) return "Nothing";
    if (showUnallocated && !visibleTripIds.size) return "Unallocated";
    return visibleTripIds.size + " of " + state.trips.length + " Trips";
  }

  function selectedTripsInGroup(groupId) {
    return state.trips.filter(function (trip) {
      return trip.groupId === groupId && visibleTripIds.has(trip.id);
    }).length;
  }

  function renderGroupFilter() {
    const previousList = groupFilterPanel.querySelector(".group-filter-options");
    const previousScrollTop = previousList ? previousList.scrollTop : 0;
    groupFilterButton.innerHTML = escapeHtml(groupSelectionText()) +
      ' <span aria-hidden="true" class="group-filter-chevron">▾</span>';
    const ordinary = !activeWarningFilter;
    const selectedTotal = ordinary ? visibleTripIds.size + (showUnallocated ? 1 : 0) : 0;
    const total = state.trips.length + 1;
    groupFilterPanel.innerHTML =
      '<label class="group-filter-select-all">' +
        '<input type="checkbox" data-group-select-all' +
          (selectedTotal === total ? ' checked' : '') + '>' +
        '<span>Select All</span>' +
      '</label>' +
      '<div class="group-filter-divider" role="separator"></div>' +
      '<div class="group-filter-options">' +
        '<div class="group-filter-ungrouped">' +
          '<label class="group-filter-option group-filter-unallocated">' +
            '<input type="checkbox" data-filter-unallocated' +
              (ordinary && showUnallocated ? ' checked' : '') + '>' +
            '<span>Unallocated</span><small>' + state.unallocated.length + '</small>' +
          '</label>' +
        '</div>' +
        groups.map(function (group) {
          const trips = state.trips.filter(function (trip) {
            return trip.groupId === group.id;
          });
          const selectedCount = ordinary ? selectedTripsInGroup(group.id) : 0;
          const expanded = expandedFilterGroups.has(group.id);
          return '<section class="group-filter-group">' +
            '<div class="group-filter-group-heading">' +
              '<button type="button" class="group-filter-expand' +
                (expanded ? ' is-expanded' : '') + '" data-expand-filter-group="' +
                escapeHtml(group.id) + '" aria-expanded="' + expanded +
                '" aria-label="' + (expanded ? 'Collapse ' : 'Expand ') +
                escapeHtml(group.name) + '"><span aria-hidden="true">›</span></button>' +
              '<label class="group-filter-option group-filter-parent">' +
                '<input type="checkbox" data-group-option="' + escapeHtml(group.id) + '"' +
                (selectedCount === trips.length ? ' checked' : '') + '>' +
                '<span>' + escapeHtml(group.name) + '</span>' +
                '<small>' + selectedCount + '/' + trips.length + '</small>' +
              '</label>' +
            '</div>' +
            '<div class="group-filter-children" id="filter-children-' +
              escapeHtml(group.id) + '"' + (expanded ? '' : ' hidden') + '>' +
              trips.map(function (trip) {
                return '<label class="group-filter-trip"><input type="checkbox" data-trip-option="' +
                  escapeHtml(trip.id) + '"' +
                  (ordinary && visibleTripIds.has(trip.id) ? ' checked' : '') + '>' +
                  '<span>' + escapeHtml(trip.name) +
                    (isRangeView() ? ' · ' + escapeHtml(shortDate(trip.date)) : '') +
                    '</span></label>';
              }).join("") +
            '</div>' +
          '</section>';
        }).join("") +
        // The special warning filters are deliberately last and compact.
        // Their purpose here is to reflect the active Show-button filter;
        // users do not need to browse a second list of affected Trips.
        '<div class="group-filter-specials"' + (isRangeView() ? ' hidden' : '') + '>' +
          (isRangeView() ? [] : warningKinds).map(function (kind) {
            const affected = warningTrips(kind);
            return '<label class="group-filter-option group-filter-warning-option">' +
                '<input type="checkbox" data-warning-group="' + kind + '"' +
                  (activeWarningFilter === kind ? ' checked' : '') +
                  (affected.length ? '' : ' disabled') + '>' +
                '<span>' + escapeHtml(warningGroupDetails[kind].title) + '</span>' +
                '<small>' + affected.length + '</small>' +
              '</label>';
          }).join("") +
        '</div>' +
      '</div>' +
      '<div class="group-filter-hint">' +
        (activeWarningFilter ? 'Live issue filter — resolved Trips disappear automatically.' :
          'Select the exact Trips to display in the Day Board.') +
      '</div>';
    const list = groupFilterPanel.querySelector(".group-filter-options");
    if (list) list.scrollTop = previousScrollTop;

    const master = groupFilterPanel.querySelector('input[data-group-select-all]');
    if (master) master.indeterminate = selectedTotal > 0 && selectedTotal < total;
    groups.forEach(function (group) {
      const checkbox = groupFilterPanel.querySelector('input[data-group-option="' + group.id + '"]');
      if (!checkbox) return;
      const count = ordinary ? selectedTripsInGroup(group.id) : 0;
      const all = state.trips.filter(function (trip) {
        return trip.groupId === group.id;
      }).length;
      checkbox.indeterminate = count > 0 && count < all;
    });
  }

  function chooseTripSelection(ids, unallocatedSelected) {
    clearWarningFilterForManualSelection();
    const valid = new Set(state.trips.map(function (trip) { return trip.id; }));
    visibleTripIds = new Set(ids.filter(function (id) { return valid.has(id); }));
    showUnallocated = Boolean(unallocatedSelected);
    visibleGroupIds = new Set(groups.filter(function (group) {
      return selectedTripsInGroup(group.id) > 0;
    }).map(function (group) { return group.id; }));
    renderGroupFilter();

    if (window.DayBoardMap && window.DayBoardMap.isOpen()) {
      // The accordion reflects selected groups; Map and Grid checkboxes
      // continue to control map-mode visibility independently.
      window.DayBoardMap.onGroupsChange();
      updateColumnLimitNotice();
    } else {
      const left = scroller.scrollLeft;
      renderBoard();
      scroller.scrollLeft = Math.max(0,
        Math.min(left, scroller.scrollWidth - scroller.clientWidth));
    }
  }

  function toggleTripSelection(tripId, selected) {
    const ids = activeWarningFilter ? new Set() : new Set(visibleTripIds);
    if (selected) ids.add(tripId); else ids.delete(tripId);
    chooseTripSelection(Array.from(ids), activeWarningFilter ? false : showUnallocated);
  }

  function chooseGroups(ids) {
    const wanted = new Set(ids);
    const chosen = activeWarningFilter ? new Set() : new Set(visibleTripIds);
    state.trips.forEach(function (trip) {
      if (wanted.has(trip.groupId)) chosen.add(trip.id);
      else chosen.delete(trip.id);
    });
    chooseTripSelection(Array.from(chosen), activeWarningFilter ? false : showUnallocated);
  }

  function toggleGroup(groupId, expanded) {
    const ids = activeWarningFilter ? new Set() : new Set(visibleTripIds);
    state.trips.filter(function (trip) { return trip.groupId === groupId; })
      .forEach(function (trip) {
        if (expanded) ids.add(trip.id); else ids.delete(trip.id);
      });
    chooseTripSelection(Array.from(ids), activeWarningFilter ? false : showUnallocated);
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
    const toggle = event.target.closest("button[data-expand-filter-group]");
    if (!toggle) return;
    const groupId = toggle.dataset.expandFilterGroup;
    if (expandedFilterGroups.has(groupId)) expandedFilterGroups.delete(groupId);
    else expandedFilterGroups.add(groupId);
    renderGroupFilter();
  });
  groupFilterPanel.addEventListener("change", function (event) {
    const warning = event.target.closest('input[data-warning-group]');
    if (warning) {
      if (warning.checked) {
        activateWarningFilter(warning.dataset.warningGroup);
      } else if (activeWarningFilter === warning.dataset.warningGroup) {
        // Unticking the special group restores the prior normal selection.
        activeWarningFilter = null;
        if (savedFilterBeforeWarning) {
          visibleTripIds = new Set(savedFilterBeforeWarning.tripIds);
          showUnallocated = savedFilterBeforeWarning.unallocated;
          visibleGroupIds = new Set(savedFilterBeforeWarning.groupIds);
        }
        savedFilterBeforeWarning = null;
        renderBoard();
      }
      return;
    }
    const selectAll = event.target.closest('input[data-group-select-all]');
    if (selectAll) {
      chooseTripSelection(selectAll.checked
        ? state.trips.map(function (trip) { return trip.id; }) : [], selectAll.checked);
      return;
    }
    const unallocated = event.target.closest('input[data-filter-unallocated]');
    if (unallocated) {
      chooseTripSelection(activeWarningFilter ? [] : Array.from(visibleTripIds), unallocated.checked);
      return;
    }
    const group = event.target.closest('input[data-group-option]');
    if (group) {
      toggleGroup(group.dataset.groupOption, group.checked);
      return;
    }
    const trip = event.target.closest('input[data-trip-option]');
    if (trip) toggleTripSelection(trip.dataset.tripOption, trip.checked);
  });
  document.addEventListener("pointerdown", function (event) {
    if (!groupFilterPanel.hidden && !groupFilterWrap.contains(event.target)) {
      closeGroupFilter();
    }
  });


  // Driver changes are edited in a working copy. None of these controls
  // mutate the Day Board until Save and Close is pressed.
  function driverDialogRows() {
    const editedTrip = getTrip(driverDialogTripId);
    const sameDayTrips = state.trips.filter(function (trip) {
      return trip.date === editedTrip.date;
    });
    // A driver assigned on another day is still available on this date.
    const used = new Set(sameDayTrips.map(function (trip) {
      return draftDrivers[trip.id];
    }).filter(Boolean));
    const free = availableDrivers.filter(function (name) { return !used.has(name); });
    const rows = sameDayTrips.filter(function (trip) {
      return trip.id !== driverDialogTripId && Boolean(draftDrivers[trip.id]);
    }).map(function (trip) {
      return { name: draftDrivers[trip.id], tripId: trip.id, tripName: trip.name,
        tripLabel: trip.name + (isRangeView() ? " · " + shortDate(trip.date) : ""), tripDate: trip.date };
    });
    rows.sort(function (a, b) {
      return a.name.localeCompare(b.name, "en-GB") ||
        a.tripName.localeCompare(b.tripName, "en-GB") ||
        a.tripDate.localeCompare(b.tripDate);
    });
    return { unassigned: free, assigned: rows };
  }

  function renderDriverDialog() {
    if (!driverDialogTripId || !draftDrivers) return;
    const trip = getTrip(driverDialogTripId);
    if (!trip) return;
    const currentDriver = draftDrivers[trip.id] || "";
    driverDialogTripName.textContent = trip.name;
    driverDialogCurrent.textContent = currentDriver || "Unassigned";
    driverDialogCurrent.classList.toggle("is-unassigned", !currentDriver);
    driverDialogUnassign.hidden = !currentDriver;
    document.getElementById("driver-dialog-date").textContent =
      shortDate(trip.date || dateSelection.day).replace(/^([A-Za-z]{3})/, function (_, dow) {
        return { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday",
          Fri:"Friday", Sat:"Saturday", Sun:"Sunday" }[dow];
      });
    const lists = driverDialogRows();

    const freeRows = lists.unassigned.map(function (name) {
      return '<div class="driver-dialog-row">' +
        '<span class="driver-row-name">' + escapeHtml(name) + '</span>' +
        '<div class="driver-row-actions"><button type="button" class="driver-action-assign"' +
          ' data-driver-action="assign" data-driver-name="' + escapeHtml(name) +
          '" title="Assign ' + escapeHtml(name) + ' to ' + escapeHtml(trip.name) + '">Assign</button></div>' +
      '</div>';
    }).join("");
    const occupiedRows = lists.assigned.map(function (entry) {
      const actions = '<button type="button" class="driver-action-assign" data-driver-action="assign"' +
        ' data-driver-name="' + escapeHtml(entry.name) +
        '" data-other-trip="' + escapeHtml(entry.tripId) + '" title="Assign without removing other Trips">Assign</button>' +
        (currentDriver
          ? '<button type="button" class="driver-action-swap" data-driver-action="swap"' +
              ' data-driver-name="' + escapeHtml(entry.name) +
              '" data-other-trip="' + escapeHtml(entry.tripId) +
              '" title="Exchange drivers with ' + escapeHtml(entry.tripName) + '">Swap</button>'
          : "");
      return '<div class="driver-dialog-row">' +
        '<span class="driver-row-description">' +
          '<strong class="driver-row-name">' + escapeHtml(entry.name) + '</strong>' +
          '<span class="driver-row-trip">' + escapeHtml(entry.tripLabel) + '</span></span>' +
        '<div class="driver-row-actions">' + actions + '</div>' +
      '</div>';
    }).join("");
    const previousScrollTop = driverDialogList.scrollTop;
    driverDialogList.innerHTML =
      '<section class="driver-dialog-section">' +
        '<h3>Unassigned drivers <span>' + lists.unassigned.length + '</span></h3>' +
        (freeRows || '<p class="driver-dialog-empty">All drivers are currently assigned.</p>') +
      '</section>' +
      '<section class="driver-dialog-section">' +
        '<h3>Assigned drivers <span>' + lists.assigned.length + ' allocations</span></h3>' +
        (occupiedRows || '<p class="driver-dialog-empty">No other drivers currently assigned.</p>') +
      '</section>';
    driverDialogList.scrollTop = previousScrollTop;
  }

  function openDriverDialog(tripId) {
    if (!getTrip(tripId) || pendingDrag || activeDrag) return;
    driverDialogTripId = tripId;
    draftDrivers = getDriverAssignments();
    closeGroupFilter();
    renderDriverDialog();
    driverDialogBackdrop.hidden = false;
    document.body.classList.add("has-driver-dialog");
    driverDialog.focus();
  }

  function closeDriverDialog() {
    const tripId = driverDialogTripId;
    driverDialogBackdrop.hidden = true;
    document.body.classList.remove("has-driver-dialog");
    driverDialogTripId = null;
    draftDrivers = null;
    if (tripId) {
      const edit = board.querySelector('.driver-change-button[data-driver-trip="' + tripId + '"]');
      if (edit) edit.focus();
      else groupFilterButton.focus();
    }
  }

  function updateDraftDriver(action, driverName, otherTripId) {
    if (!draftDrivers || !driverDialogTripId) return;
    if (action === "unassign") {
      draftDrivers[driverDialogTripId] = "";
    } else if (action === "assign" && availableDrivers.includes(driverName)) {
      draftDrivers[driverDialogTripId] = driverName;
    } else if (action === "swap" && draftDrivers[driverDialogTripId] &&
               otherTripId && otherTripId !== driverDialogTripId &&
               getTrip(otherTripId) && getTrip(otherTripId).date === getTrip(driverDialogTripId).date &&
               draftDrivers[otherTripId] === driverName) {
      const previous = draftDrivers[driverDialogTripId];
      draftDrivers[driverDialogTripId] = driverName;
      draftDrivers[otherTripId] = previous;
    } else {
      return;
    }
    renderDriverDialog();
  }

  function saveDriverDialog() {
    if (!draftDrivers || !driverAssignmentsValid(draftDrivers)) return;
    const before = getHistoryState();
    const name = getTrip(driverDialogTripId).name;
    applyDriverAssignments(draftDrivers);
    const after = getHistoryState();
    if (JSON.stringify(before.drivers) !== JSON.stringify(after.drivers)) {
      addHistoryEntry({
        kind: "drivers", before: before, after: after,
        description: "Driver assignments updated for " + name
      });
    }
    persistPlacement();
    // Always refresh the Day Board, even if no warning is affected.
    renderBoard();
    closeDriverDialog();
    showToast("Driver assignments saved", name);
  }

  board.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-driver-trip]");
    if (!button || !board.contains(button)) return;
    event.preventDefault();
    openDriverDialog(button.dataset.driverTrip);
  });
  driverDialogUnassign.addEventListener("click", function () {
    updateDraftDriver("unassign");
  });
  driverDialogList.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-driver-action]");
    if (!button) return;
    updateDraftDriver(button.dataset.driverAction,
      button.dataset.driverName, button.dataset.otherTrip || "");
  });
  document.getElementById("driver-dialog-save").addEventListener("click", saveDriverDialog);
  document.getElementById("driver-dialog-cancel").addEventListener("click", closeDriverDialog);
  document.getElementById("driver-dialog-close").addEventListener("click", closeDriverDialog);
  driverDialogBackdrop.addEventListener("pointerdown", function (event) {
    if (event.target === driverDialogBackdrop) closeDriverDialog();
  });
  driverDialog.addEventListener("keydown", function (event) {
    if (event.key !== "Tab") return;
    const controls = Array.from(driverDialog.querySelectorAll('button:not([hidden]):not(:disabled)'));
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Vehicles use the same provisional Assign/Swap/Unassign workflow as drivers.
  // Vehicle changes are edited in a working copy. None of these controls
  // mutate the Day Board until Save and Close is pressed.
  function vehicleDialogRows() {
    const editedTrip = getTrip(vehicleDialogTripId);
    const sameDayTrips = state.trips.filter(function (trip) {
      return trip.date === editedTrip.date;
    });
    // An allocated vehicle on another date can still be available today.
    const used = new Set(sameDayTrips.map(function (trip) {
      return draftVehicles[trip.id];
    }).filter(Boolean));
    const free = availableVehicles.filter(function (name) { return !used.has(name); });
    const rows = sameDayTrips.filter(function (trip) {
      return trip.id !== vehicleDialogTripId && Boolean(draftVehicles[trip.id]);
    }).map(function (trip) {
      return { name: draftVehicles[trip.id], tripId: trip.id, tripName: trip.name,
        tripLabel: trip.name + (isRangeView() ? " · " + shortDate(trip.date) : ""), tripDate: trip.date };
    });
    rows.sort(function (a, b) {
      return a.name.localeCompare(b.name, "en-GB") ||
        a.tripName.localeCompare(b.tripName, "en-GB") ||
        a.tripDate.localeCompare(b.tripDate);
    });
    return { unassigned: free, assigned: rows };
  }

  function renderVehicleDialog() {
    if (!vehicleDialogTripId || !draftVehicles) return;
    const trip = getTrip(vehicleDialogTripId);
    if (!trip) return;
    const currentVehicle = draftVehicles[trip.id] || "";
    vehicleDialogTripName.textContent = trip.name;
    vehicleDialogCurrent.textContent = currentVehicle || "Unassigned";
    vehicleDialogCurrent.classList.toggle("is-unassigned", !currentVehicle);
    vehicleDialogUnassign.hidden = !currentVehicle;
    document.getElementById("vehicle-dialog-date").textContent =
      shortDate(trip.date || dateSelection.day).replace(/^([A-Za-z]{3})/, function (_, dow) {
        return { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday",
          Fri:"Friday", Sat:"Saturday", Sun:"Sunday" }[dow];
      });
    const lists = vehicleDialogRows();

    const freeRows = lists.unassigned.map(function (name) {
      return '<div class="driver-dialog-row">' +
        '<span class="driver-row-name">' + escapeHtml(name) + '</span>' +
        '<div class="driver-row-actions"><button type="button" class="driver-action-assign"' +
          ' data-vehicle-action="assign" data-vehicle-name="' + escapeHtml(name) +
          '" title="Assign ' + escapeHtml(name) + ' to ' + escapeHtml(trip.name) + '">Assign</button></div>' +
      '</div>';
    }).join("");
    const occupiedRows = lists.assigned.map(function (entry) {
      const actions = '<button type="button" class="driver-action-assign" data-vehicle-action="assign"' +
        ' data-vehicle-name="' + escapeHtml(entry.name) +
        '" data-other-trip="' + escapeHtml(entry.tripId) + '" title="Assign without removing other Trips">Assign</button>' +
        (currentVehicle
          ? '<button type="button" class="driver-action-swap" data-vehicle-action="swap"' +
              ' data-vehicle-name="' + escapeHtml(entry.name) +
              '" data-other-trip="' + escapeHtml(entry.tripId) +
              '" title="Exchange vehicles with ' + escapeHtml(entry.tripName) + '">Swap</button>'
          : "");
      return '<div class="driver-dialog-row">' +
        '<span class="driver-row-description">' +
          '<strong class="driver-row-name">' + escapeHtml(entry.name) + '</strong>' +
          '<span class="driver-row-trip">' + escapeHtml(entry.tripLabel) + '</span></span>' +
        '<div class="driver-row-actions">' + actions + '</div>' +
      '</div>';
    }).join("");
    const previousScrollTop = vehicleDialogList.scrollTop;
    vehicleDialogList.innerHTML =
      '<section class="driver-dialog-section">' +
        '<h3>Unassigned vehicles <span>' + lists.unassigned.length + '</span></h3>' +
        (freeRows || '<p class="driver-dialog-empty">All vehicles are currently assigned.</p>') +
      '</section>' +
      '<section class="driver-dialog-section">' +
        '<h3>Assigned vehicles <span>' + lists.assigned.length + ' allocations</span></h3>' +
        (occupiedRows || '<p class="driver-dialog-empty">No other vehicles currently assigned.</p>') +
      '</section>';
    vehicleDialogList.scrollTop = previousScrollTop;
  }

  function openVehicleDialog(tripId) {
    if (!getTrip(tripId) || pendingDrag || activeDrag) return;
    vehicleDialogTripId = tripId;
    draftVehicles = getVehicleAssignments();
    closeGroupFilter();
    renderVehicleDialog();
    vehicleDialogBackdrop.hidden = false;
    document.body.classList.add("has-driver-dialog");
    vehicleDialog.focus();
  }

  function closeVehicleDialog() {
    const tripId = vehicleDialogTripId;
    vehicleDialogBackdrop.hidden = true;
    document.body.classList.remove("has-driver-dialog");
    vehicleDialogTripId = null;
    draftVehicles = null;
    if (tripId) {
      const edit = board.querySelector('.vehicle-change-button[data-vehicle-trip="' + tripId + '"]');
      if (edit) edit.focus();
      else groupFilterButton.focus();
    }
  }

  function updateDraftVehicle(action, vehicleRegistration, otherTripId) {
    if (!draftVehicles || !vehicleDialogTripId) return;
    if (action === "unassign") {
      draftVehicles[vehicleDialogTripId] = "";
    } else if (action === "assign" && availableVehicles.includes(vehicleRegistration)) {
      draftVehicles[vehicleDialogTripId] = vehicleRegistration;
    } else if (action === "swap" && draftVehicles[vehicleDialogTripId] &&
               otherTripId && otherTripId !== vehicleDialogTripId &&
               getTrip(otherTripId) && getTrip(otherTripId).date === getTrip(vehicleDialogTripId).date &&
               draftVehicles[otherTripId] === vehicleRegistration) {
      const previous = draftVehicles[vehicleDialogTripId];
      draftVehicles[vehicleDialogTripId] = vehicleRegistration;
      draftVehicles[otherTripId] = previous;
    } else {
      return;
    }
    renderVehicleDialog();
  }

  function saveVehicleDialog() {
    if (!draftVehicles || !vehicleAssignmentsValid(draftVehicles)) return;
    const before = getHistoryState();
    const name = getTrip(vehicleDialogTripId).name;
    applyVehicleAssignments(draftVehicles);
    const after = getHistoryState();
    if (JSON.stringify(before.vehicles) !== JSON.stringify(after.vehicles)) {
      addHistoryEntry({
        kind: "vehicles", before: before, after: after,
        description: "Vehicle assignments updated for " + name
      });
    }
    persistPlacement();
    // Always refresh the Day Board, even if no warning is affected.
    renderBoard();
    closeVehicleDialog();
    showToast("Vehicle assignments saved", name);
  }

  board.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-vehicle-trip]");
    if (!button || !board.contains(button)) return;
    event.preventDefault();
    openVehicleDialog(button.dataset.vehicleTrip);
  });
  vehicleDialogUnassign.addEventListener("click", function () {
    updateDraftVehicle("unassign");
  });
  vehicleDialogList.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-vehicle-action]");
    if (!button) return;
    updateDraftVehicle(button.dataset.vehicleAction,
      button.dataset.vehicleName, button.dataset.otherTrip || "");
  });
  document.getElementById("vehicle-dialog-save").addEventListener("click", saveVehicleDialog);
  document.getElementById("vehicle-dialog-cancel").addEventListener("click", closeVehicleDialog);
  document.getElementById("vehicle-dialog-close").addEventListener("click", closeVehicleDialog);
  vehicleDialogBackdrop.addEventListener("pointerdown", function (event) {
    if (event.target === vehicleDialogBackdrop) closeVehicleDialog();
  });
  vehicleDialog.addEventListener("keydown", function (event) {
    if (event.key !== "Tab") return;
    const controls = Array.from(vehicleDialog.querySelectorAll('button:not([hidden]):not(:disabled)'));
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
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

    const before = getHistoryState();
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

    const after = getHistoryState();
    if (JSON.stringify(before) === JSON.stringify(after)) return false;
    addHistoryEntry({
      kind: "jobs", before: before, after: after,
      jobIds: ids, jobId: grabbedJobId || ids[0]
    });
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
    if (event.target.closest(".driver-change-button")) return;
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

  function restoreHistory(entry, snapshot, action) {
    if (!applyHistoryState(snapshot)) return;
    persistPlacement();
    renderBoard();
    if (entry.kind === "drivers" || entry.kind === "vehicles") {
      showToast(action, entry.description);
    } else {
      const ids = entry.jobIds || [entry.jobId];
      setSelectedJobs(ids, entry.jobId);
      showToast(action, moveDescription(ids));
    }
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
    if (!window.confirm("Reset the Day Board to its original sample Jobs, sequences, driver assignments and vehicle assignments? This clears Undo/Redo history.")) return;
    dayStore.clear();
    state = buildView();
    activeWarningFilter = null;
    savedFilterBeforeWarning = null;
    visibleTripIds = new Set(state.trips.map(function (trip) { return trip.id; }));
    visibleGroupIds = new Set(groups.map(function (group) { return group.id; }));
    showUnallocated = true;
    selectedJobIds = new Set();
    selectionAnchorId = null;
    undoStack = [];
    redoStack = [];
    persistPlacement();
    scroller.scrollLeft = 0;
    scroller.scrollTop = 0;
    renderBoard();
    showToast("Sample data reset", "All dated Jobs, drivers and vehicles restored.");
  });

  document.addEventListener("keydown", function (event) {
    if (!dateRangeBackdrop.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDateFilter();
      }
      return;
    }
    if (!driverDialogBackdrop.hidden || !vehicleDialogBackdrop.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!driverDialogBackdrop.hidden) closeDriverDialog();
        if (!vehicleDialogBackdrop.hidden) closeVehicleDialog();
      }
      // Do not let Undo/Redo shortcuts mutate the underlying board while
      // the dialog is editing a provisional copy of its assignments.
      return;
    }
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


  // Date filter: Preset/Custom choices remain provisional until Apply.
  // The central date caption is deliberately conspicuous to prevent editing
  // Trips on the wrong day. Today and all calendar dates use browser-local time.
  const dateLabelElement = document.getElementById("date-current");
  const dateTodayButton = document.getElementById("date-today");
  const datePrevButton = document.getElementById("date-prev");
  const dateNextButton = document.getElementById("date-next");
  const dateSortWrap = document.getElementById("date-main-sort");
  const dateSortLabel = document.getElementById("date-sort-label");
  const dateRangeBackdrop = document.getElementById("date-range-backdrop");
  const dateRangeDialog = dateRangeBackdrop.querySelector(".date-range-dialog");
  const dateRangeCalendar = document.getElementById("date-range-calendar");
  const dateRangeInstruction = document.getElementById("date-range-instruction");
  const dateRangeWeekdayBlock = document.getElementById("date-range-weekday-block");
  const dateWeekdays = document.getElementById("date-range-weekdays");
  const dateRangeError = document.getElementById("date-range-error");
  const presetPanel = document.getElementById("date-preset-panel");
  const customPanel = document.getElementById("date-custom-panel");
  const presetOptions = document.getElementById("date-preset-options");
  const presetDescription = document.getElementById("date-preset-description");
  const tabPreset = document.getElementById("date-tab-preset");
  const tabCustom = document.getElementById("date-tab-custom");
  const modeSingle = document.getElementById("date-mode-single");
  const modeRange = document.getElementById("date-mode-range");
  let rangeCalendarMonth = todayKey.slice(0, 7) + "-01";
  let dateDraft = null;

  function updateDateDisplay() {
    const single = !isRangeView();
    const count = datesInSelection().length;
    dateLabelElement.textContent = single
      ? dateLabel(dateSelection.day) + ", " + relativeDateDescription(dateSelection.day)
      : dateLabel(dateSelection.start) + " – " + dateLabel(dateSelection.end) +
        " · " + count + (count === 1 ? " day" : " days");
    dateLabelElement.title = single ? shortDate(dateSelection.day)
      : count + " selected days";
    dateTodayButton.disabled = single && dateSelection.day === todayKey;
    datePrevButton.hidden = !single;
    dateNextButton.hidden = !single;
    dateSortWrap.hidden = single;
    dateSortLabel.textContent = dateSelection.order === "date-round"
      ? "Date then Round" : "Round then Date";
    document.body.classList.toggle("date-range-view", !single);
  }

  function chooseDateSelection(next) {
    // Preserve dated Jobs/assignments before switching filters.
    persistPlacement();
    const selectedRounds = new Set(Array.from(visibleTripIds).map(function (id) {
      return id.split("@")[0];
    }));
    if (activeWarningFilter && savedFilterBeforeWarning) {
      selectedRounds.clear();
      savedFilterBeforeWarning.tripIds.forEach(function (id) {
        selectedRounds.add(id.split("@")[0]);
      });
      showUnallocated = savedFilterBeforeWarning.unallocated;
    }
    if (window.DayBoardMap && window.DayBoardMap.isOpen()) window.DayBoardMap.hideMap();
    dateSelection = next;
    activeWarningFilter = null;
    savedFilterBeforeWarning = null;
    state = buildView();
    visibleTripIds = new Set(state.trips.filter(function (trip) {
      return selectedRounds.has(trip.roundId);
    }).map(function (trip) { return trip.id; }));
    visibleGroupIds = new Set(groups.filter(function (group) {
      return state.trips.some(function (trip) {
        return trip.groupId === group.id && visibleTripIds.has(trip.id);
      });
    }).map(function (group) { return group.id; }));
    selectedJobIds = new Set();
    selectionAnchorId = null;
    undoStack = [];
    redoStack = [];
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
    updateDateDisplay();
    renderBoard();
  }

  function closeDateFilter() {
    dateRangeBackdrop.hidden = true;
    dateDraft = null;
    document.body.classList.remove("has-date-range-dialog");
    document.getElementById("date-range-open").focus();
  }

  function monthShift(iso, delta) {
    const date = fromIso(iso);
    date.setDate(1);
    date.setMonth(date.getMonth() + delta);
    return isoLocal(date);
  }

  function startOfWeek(key) { return addDays(key, -dayIndex(key)); }

  function presetSelection(key) {
    let start, end;
    if (key === "today" || key === "tomorrow") {
      const day = key === "today" ? todayKey : addDays(todayKey, 1);
      return { mode: "single", day: day, start: day, end: day,
        weekdays: [0, 1, 2, 3, 4, 5, 6], order: "round-date",
        source: "preset", preset: key };
    }
    if (key === "this-week" || key === "next-week") {
      start = addDays(startOfWeek(todayKey), key === "next-week" ? 7 : 0);
      end = addDays(start, 6);
    } else if (key === "this-month" || key === "next-month") {
      const date = fromIso(todayKey);
      const offset = key === "next-month" ? 1 : 0;
      start = isoLocal(new Date(date.getFullYear(), date.getMonth() + offset, 1, 12));
      end = isoLocal(new Date(date.getFullYear(), date.getMonth() + offset + 1, 0, 12));
    } else {
      return null;
    }
    return { mode: "range", day: start, start: start, end: end,
      weekdays: [0, 1, 2, 3, 4, 5, 6], order: dateSelection.order,
      source: "preset", preset: key };
  }

  function calendarMarkup(monthKey) {
    const shownMonth = fromIso(monthKey);
    const firstDay = isoLocal(new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1, 12));
    const gridStart = addDays(firstDay, -dayIndex(firstDay));
    const single = dateDraft && dateDraft.customMode === "single";
    const selected = single ? dateDraft.day : null;
    const start = !single && dateDraft ? dateDraft.start : null;
    const end = !single && dateDraft ? dateDraft.end : null;
    const weekdays = WEEKDAYS.map(function (day) {
      return '<span class="date-calendar-weekday">' + day + '</span>';
    }).join("");
    const days = Array.from({ length: 42 }, function (_, index) {
      const iso = addDays(gridStart, index), value = fromIso(iso);
      const today = iso === todayKey;
      const inRange = start && end && iso >= start && iso <= end;
      const chosen = (selected === iso) || start === iso || end === iso;
      return '<button type="button" class="date-calendar-day' +
        (value.getMonth() === shownMonth.getMonth() ? '' : ' is-other-month') +
        (today ? ' is-today' : '') +
        (inRange ? ' is-in-range' : '') +
        (chosen ? ' is-selected' : '') +
        '" data-calendar-day="' + iso + '" aria-label="' +
        value.toLocaleDateString("en-GB", { weekday: "long", day: "numeric",
          month: "long", year: "numeric" }) + '"' +
        (today ? ' aria-current="date"' : '') +
        (chosen ? ' aria-pressed="true"' : ' aria-pressed="false"') +
        '>' + value.getDate() + '</button>';
    }).join("");
    return '<div class="date-calendar-header">' +
      '<button type="button" class="date-calendar-arrow" data-month-step="-1" aria-label="Previous month">‹</button>' +
      '<strong>' + MONTH_NAMES[shownMonth.getMonth()] + ' ' + shownMonth.getFullYear() + '</strong>' +
      '<button type="button" class="date-calendar-arrow" data-month-step="1" aria-label="Next month">›</button>' +
      '</div><div class="date-calendar-grid">' + weekdays + days + '</div>';
  }

  function renderDateFilter() {
    if (!dateDraft) return;
    const custom = dateDraft.tab === "custom";
    tabPreset.classList.toggle("is-active", !custom);
    tabCustom.classList.toggle("is-active", custom);
    tabPreset.setAttribute("aria-pressed", String(!custom));
    tabCustom.setAttribute("aria-pressed", String(custom));
    presetPanel.hidden = custom;
    customPanel.hidden = !custom;
    presetOptions.querySelectorAll('button[data-date-preset]').forEach(function (button) {
      const active = dateDraft.preset === button.dataset.datePreset;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const candidate = presetSelection(dateDraft.preset);
    presetDescription.textContent = candidate
      ? (candidate.mode === "single" ? dateLabel(candidate.day)
        : dateLabel(candidate.start) + " – " + dateLabel(candidate.end))
      : "";
    modeSingle.classList.toggle("is-active", dateDraft.customMode === "single");
    modeRange.classList.toggle("is-active", dateDraft.customMode === "range");
    modeSingle.setAttribute("aria-pressed", String(dateDraft.customMode === "single"));
    modeRange.setAttribute("aria-pressed", String(dateDraft.customMode === "range"));
    dateRangeWeekdayBlock.hidden = dateDraft.customMode !== "range";
    if (!custom) return;
    dateRangeCalendar.innerHTML = calendarMarkup(rangeCalendarMonth);
    dateRangeInstruction.textContent = dateDraft.customMode === "single"
      ? (dateDraft.day ? "Selected: " + dateLabel(dateDraft.day) : "Select date")
      : dateDraft.stage === "end" ? "Select end date"
      : dateDraft.start && dateDraft.end
        ? dateLabel(dateDraft.start) + " – " + dateLabel(dateDraft.end)
        : "Select start date";
    dateWeekdays.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.checked = dateDraft.weekdays.has(Number(input.value));
    });
  }

  function openDateFilter() {
    const custom = dateSelection.source === "custom";
    dateDraft = {
      tab: custom ? "custom" : "preset",
      preset: dateSelection.preset || "today",
      customMode: dateSelection.mode,
      day: dateSelection.mode === "single" ? dateSelection.day : null,
      start: custom && isRangeView() ? dateSelection.start : null,
      end: custom && isRangeView() ? dateSelection.end : null,
      stage: custom && isRangeView() ? "done" : "start",
      weekdays: new Set(dateSelection.mode === "range"
        ? dateSelection.weekdays : [0, 1, 2, 3, 4, 5, 6])
    };
    rangeCalendarMonth = (dateDraft.day || dateDraft.start || todayKey).slice(0, 7) + "-01";
    dateRangeError.textContent = "";
    dateRangeError.hidden = true;
    renderDateFilter();
    dateRangeBackdrop.hidden = false;
    document.body.classList.add("has-date-range-dialog");
    dateRangeDialog.focus();
  }

  function changeCustomMode(mode) {
    if (!dateDraft || !["single", "range"].includes(mode)) return;
    dateDraft.customMode = mode;
    if (mode === "range" && !dateDraft.start && !dateDraft.end) {
      dateDraft.stage = "start";
    }
    dateRangeError.hidden = true;
    renderDateFilter();
  }

  function onCalendarAction(event) {
    const step = event.target.closest("button[data-month-step]");
    if (step) {
      rangeCalendarMonth = monthShift(rangeCalendarMonth, Number(step.dataset.monthStep));
      renderDateFilter();
      return;
    }
    const item = event.target.closest("button[data-calendar-day]");
    if (!item || !dateDraft || dateDraft.tab !== "custom") return;
    const iso = item.dataset.calendarDay;
    if (dateDraft.customMode === "single") {
      dateDraft.day = iso;
    } else if (dateDraft.stage === "start" || dateDraft.stage === "done") {
      dateDraft.start = iso;
      dateDraft.end = null;
      dateDraft.stage = "end";
    } else {
      // Selecting the second date earlier than the first simply reverses
      // the bounds; the user's first click becomes the end date.
      dateDraft.end = iso < dateDraft.start ? dateDraft.start : iso;
      dateDraft.start = iso < dateDraft.start ? iso : dateDraft.start;
      dateDraft.stage = "done";
    }
    dateRangeError.hidden = true;
    renderDateFilter();
  }

  function applyDateFilter() {
    if (!dateDraft) return;
    let next = null;
    let error = "";
    if (dateDraft.tab === "preset") {
      next = presetSelection(dateDraft.preset);
    } else if (dateDraft.customMode === "single") {
      if (!dateDraft.day) error = "Please select a date.";
      else next = { mode: "single", day: dateDraft.day,
        start: dateDraft.day, end: dateDraft.day,
        weekdays: [0, 1, 2, 3, 4, 5, 6], order: dateSelection.order,
        source: "custom", preset: null };
    } else if (!dateDraft.start || !dateDraft.end) {
      error = "Please select both start and end dates.";
    } else if (!dateDraft.weekdays.size) {
      error = "Select at least one day of the week.";
    } else {
      const count = Math.round((fromIso(dateDraft.end) - fromIso(dateDraft.start)) / DAY_MS) + 1;
      if (count > 31) error = "Select up to 31 calendar days in this prototype.";
      else {
        const weekdays = Array.from(dateDraft.weekdays).sort();
        let included = 0;
        for (let day = dateDraft.start; day <= dateDraft.end; day = addDays(day, 1)) {
          if (weekdays.includes(dayIndex(day))) included += 1;
        }
        if (!included) error = "No selected weekdays fall within this date range.";
        else next = { mode: "range", day: dateDraft.start,
          start: dateDraft.start, end: dateDraft.end,
          weekdays: weekdays, order: dateSelection.order,
          source: "custom", preset: null };
      }
    }
    if (next) {
      closeDateFilter();
      chooseDateSelection(next);
    } else {
      dateRangeError.textContent = error || "Please select a date filter.";
      dateRangeError.hidden = false;
    }
  }

  function bindDateControls() {
    datePrevButton.addEventListener("click", function () {
      if (isRangeView()) return;
      const day = addDays(dateSelection.day, -1);
      chooseDateSelection({ mode: "single", day: day, start: day, end: day,
        weekdays: [0, 1, 2, 3, 4, 5, 6], order: dateSelection.order,
        source: "custom", preset: null });
    });
    dateNextButton.addEventListener("click", function () {
      if (isRangeView()) return;
      const day = addDays(dateSelection.day, 1);
      chooseDateSelection({ mode: "single", day: day, start: day, end: day,
        weekdays: [0, 1, 2, 3, 4, 5, 6], order: dateSelection.order,
        source: "custom", preset: null });
    });
    dateTodayButton.addEventListener("click", function () {
      chooseDateSelection(presetSelection("today"));
    });
    document.getElementById("date-range-open").addEventListener("click", openDateFilter);
    tabPreset.addEventListener("click", function () {
      dateDraft.tab = "preset";
      dateRangeError.hidden = true;
      renderDateFilter();
    });
    tabCustom.addEventListener("click", function () {
      dateDraft.tab = "custom";
      dateRangeError.hidden = true;
      renderDateFilter();
    });
    presetOptions.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-date-preset]");
      if (!button) return;
      dateDraft.preset = button.dataset.datePreset;
      dateRangeError.hidden = true;
      renderDateFilter();
    });
    modeSingle.addEventListener("click", function () { changeCustomMode("single"); });
    modeRange.addEventListener("click", function () { changeCustomMode("range"); });
    dateRangeCalendar.addEventListener("click", onCalendarAction);
    dateWeekdays.addEventListener("change", function (event) {
      const input = event.target;
      if (!input || input.type !== "checkbox" || !dateDraft) return;
      const index = Number(input.value);
      if (input.checked) dateDraft.weekdays.add(index);
      else dateDraft.weekdays.delete(index);
      dateRangeError.hidden = true;
    });
    document.getElementById("date-sort-toggle").addEventListener("click", function () {
      if (!isRangeView()) return;
      dateSelection.order = dateSelection.order === "round-date" ? "date-round" : "round-date";
      updateDateDisplay();
      renderBoard();
    });
    document.getElementById("date-range-apply").addEventListener("click", applyDateFilter);
    document.getElementById("date-range-cancel").addEventListener("click", closeDateFilter);
    document.getElementById("date-range-close").addEventListener("click", closeDateFilter);
    dateRangeBackdrop.addEventListener("pointerdown", function (event) {
      if (event.target === dateRangeBackdrop) closeDateFilter();
    });
    dateRangeDialog.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") return;
      const controls = Array.from(dateRangeDialog.querySelectorAll('button:not(:disabled),input:not(:disabled)'))
        .filter(function (control) { return control.getClientRects().length > 0; });
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  readSavedPlacement();
  updateDateDisplay();
  bindDateControls();
  renderGroupFilter();
  renderBoard();
  if (window.DayBoardMap) {
    window.DayBoardMap.bind({
      getState: function () { return state; },
      getSelectedIds: function () { return Array.from(selectedJobIds); },
      renderBoard: renderBoard,
      getVisibleGroupIds: function () {
        return activeWarningFilter
          ? Array.from(new Set(sortedWarningTrips(activeWarningFilter).map(function (trip) {
              return trip.groupId;
            })))
          : Array.from(visibleGroupIds);
      },
      getVisibleTripIds: function () {
        return activeWarningFilter
          ? sortedWarningTrips(activeWarningFilter).map(function (trip) { return trip.id; })
          : Array.from(visibleTripIds);
      },
      isUnallocatedSelected: function () { return !activeWarningFilter && showUnallocated; },
      isRangeView: isRangeView,
      formatTripDate: shortDate,
      getDisplayTripIds: function () {
        return displayTripsInOrder().map(function (trip) { return trip.id; });
      },
      toggleGroup: toggleGroup,
      selectJob: function (jobId) { setSelectedJobs([jobId], jobId); },
      scrollToJob: scrollToJobFromMap
    });
  }
}());
