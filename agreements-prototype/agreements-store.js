/* Shared Agreements prototype storage. Works from file:// without a server. */
(function () {
  "use strict";
  const data = window.AgreementPrototypeData;
  const STORAGE_KEY = "wastetracker-agreements-prototype-v2";
  const LEGACY_KEY = "wastetracker-agreement-prototype-v1-edit";
  const deepCopy = function (value) { return JSON.parse(JSON.stringify(value)); };

  function isoFromToday(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return String(date.getFullYear()).padStart(4, "0") + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");
  }

  function serviceFixture(raw) {
    const service = deepCopy(raw);
    if (service.startDaysFromToday !== undefined) {
      service.startDate = isoFromToday(service.startDaysFromToday);
      delete service.startDaysFromToday;
    }
    if (service.jobDaysFromToday !== undefined) {
      service.jobDate = isoFromToday(service.jobDaysFromToday);
      delete service.jobDaysFromToday;
    }
    if (service.recurrence) {
      service.recurrence.startDate = service.startDate;
      service.recurrence.endDate = service.endDate || "";
    }
    return service;
  }

  function recurring(id, service, startDays, endDays, days, round, quantity, price, onHold) {
    const startDate = isoFromToday(startDays);
    const endDate = endDays == null ? "" : isoFromToday(endDays);
    return {
      id: id, service: service, serviceType: "Regular, recurring",
      jobDate: "", startDate: startDate, endDate: endDate,
      recurrence: {
        basis: "weekly", startDate: startDate, endDate: endDate,
        every: 1, weekdays: days, monthMethod: "weekday",
        ordinal: 1, weekday: days[0], monthDay: 1, saturdayShift: 0, sundayShift: 0
      },
      quantity: quantity, timing: "Morning", roundId: round.id,
      roundName: round.name, jobNotes: "", price: price,
      rateSource: "Standard rate", onHold: Boolean(onHold)
    };
  }

  function oneOff(id, service, jobDays, round, quantity, price) {
    return {
      id: id, service: service, serviceType: "Ad hoc and one-off",
      jobDate: isoFromToday(jobDays), startDate: "", endDate: "", recurrence: null,
      quantity: quantity, timing: "Any time", roundId: round.id,
      roundName: round.name, jobNotes: "", price: price,
      rateSource: "Agreement rate", onHold: false,
      jobId: "JOB-" + id.slice(-5)
    };
  }

  function record(id, customerId, siteId, containerType, containerSize, materialType, material, services) {
    return {
      id: id, customerId: customerId, siteId: siteId,
      containerType: containerType, containerSize: containerSize,
      materialType: materialType, material: material, services: services
    };
  }

  function seed() {
    const rounds = data.rounds;
    const first = record("AGR-10421", "customer-oakfield", "site-oakfield-phase2",
      "Skip", "10 yd", "Waste", "General Waste", data.demoServices.map(serviceFixture));
    try {
      const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) || "null");
      if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
        ["containerType", "containerSize", "materialType", "material", "services"].forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(legacy, key)) first[key] = deepCopy(legacy[key]);
        });
      }
    } catch (_) { /* No legacy agreement to migrate. */ }
    return {
      version: 2,
      nextNumber: 10426,
      agreements: [
        first,
        record("AGR-10422", "customer-riverside", "site-riverside-centre",
          "Bin", "1100 litres", "Waste", "General Waste",
          [recurring("svc-10422-1", "Empty", -40, null, [1, 3, 5], rounds[0], 3, "18.00")]),
        record("AGR-10423", "customer-oakfield", "site-oakfield-warehouse",
          "Skip", "12 yd", "Waste", "Mixed Construction Waste",
          [recurring("svc-10423-1", "Exchange", -110, -15, [5], rounds[1], 1, "125.00")]),
        record("AGR-10424", "customer-westbrook", "site-westbrook-east",
          "Loose", "Items", "Non-waste", "Furniture",
          [oneOff("svc-10424-1", "Wait and Load", 8, rounds[3], 2, "80.00"),
           oneOff("svc-10424-2", "Wait and Load", -11, rounds[3], 1, "40.00")]),
        record("AGR-10425", "customer-riverside", "site-riverside-depot",
          "Bin", "660 litres", "Waste", "Mixed Recycling",
          [recurring("svc-10425-1", "Empty", -60, null, [2], rounds[0], 4, "15.00", true)])
      ]
    };
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.agreements)) return deepCopy(parsed);
      }
    } catch (_) { /* Fall back to fixtures when storage is unavailable. */ }
    const initial = seed();
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); } catch (_) {}
    return deepCopy(initial);
  }

  function find(id) {
    return load().agreements.find(function (agreement) { return agreement.id === id; }) || null;
  }

  function save(agreement) {
    const state = load();
    const item = deepCopy(agreement);
    if (!item.id) {
      item.id = "AGR-" + state.nextNumber++;
    }
    const index = state.agreements.findIndex(function (entry) { return entry.id === item.id; });
    if (index < 0) state.agreements.push(item);
    else state.agreements[index] = item;
    // A save failure is reported to the editor; never report success prematurely.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return deepCopy(item);
  }

  function customerFor(agreement) {
    return (data.customers || []).find(function (item) {
      return item.id === agreement.customerId;
    }) || null;
  }

  function siteFor(agreement) {
    const customer = customerFor(agreement);
    return customer && customer.sites.find(function (item) {
      return item.id === agreement.siteId;
    }) || null;
  }

  window.AgreementsPrototypeStore = {
    storageKey: STORAGE_KEY, load: load, find: find, save: save,
    customerFor: customerFor, siteFor: siteFor
  };
})();
