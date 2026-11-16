/* Sample data for Day Board V00001.
   All data is invented; no calls to WasteTracker or other services. */
(function () {
  "use strict";

  const rounds = [
    { id: "skips-1", name: "Skips 1", vehicle: "AY21 KPL", driver: "Dave Roberts", unsequenced: 2, sequenced: 17 },
    { id: "skips-2", name: "Skips 2", vehicle: "BX73 FHT", driver: "Lisa Walker", unsequenced: 1, sequenced: 14 },
    { id: "trade-1", name: "Trade Waste 1", vehicle: "HG22 LMX", driver: "John Harris", unsequenced: 2, sequenced: 16 },
    { id: "bins-1", name: "Bins 1", vehicle: "PK24 ZUV", driver: "Sarah Price", unsequenced: 0, sequenced: 19 },
    { id: "roros-1", name: "RoRo 1", vehicle: "AE70 TRK", driver: "Michael Evans", unsequenced: 1, sequenced: 13 },
    { id: "skips-3", name: "Skips 3", vehicle: "GK71 YND", driver: "Tom Fisher", unsequenced: 0, sequenced: 15 },
    { id: "recycling-1", name: "Recycling 1", vehicle: "", driver: "", unsequenced: 3, sequenced: 12 },
    { id: "muck-away", name: "Muck Away", vehicle: "DN23 JVF", driver: "Chris Turner", unsequenced: 1, sequenced: 18 },
    { id: "bin-deliveries", name: "Bin Deliveries", vehicle: "LE69 NBG", driver: "", unsequenced: 0, sequenced: 14 },
    { id: "trade-2", name: "Trade Waste 2", vehicle: "MP74 ACV", driver: "Amy Taylor", unsequenced: 2, sequenced: 16 },
    { id: "wait-load", name: "Wait and Load", vehicle: "", driver: "Peter Lewis", unsequenced: 0, sequenced: 11 },
    { id: "skips-4", name: "Skips 4", vehicle: "RD72 HBE", driver: "Ben Clarke", unsequenced: 1, sequenced: 15 }
  ];

  const customers = [
    "Acme Construction", "Northside Estates", "Westfield Builders",
    "Greenfield Homes", "Riverside Trading", "Parkside Developments",
    "Oak & Stone Ltd", "Central Facilities", "Hilltop Renovations",
    "Town Centre Stores", "Southgate Joinery", "Example Customer"
  ];
  const activities = [
    "Collect · 12 yd skip", "Exchange · 10 yd skip",
    "Deliver · 14 yd skip", "Empty · 1100 L bin",
    "Collect · Loose load", "Exchange · 660 L bin",
    "Collect · 20 yd RoRo", "Wait and load"
  ];

  function makeInitialState() {
    const jobs = {};
    let number = 1045;
    let sampleIndex = 0;

    function addJob() {
      const id = "job-" + number;
      jobs[id] = {
        id: id,
        reference: String(number),
        customer: customers[sampleIndex % customers.length],
        detail: activities[(sampleIndex * 3 + Math.floor(sampleIndex / 4)) % activities.length]
      };
      number += 1;
      sampleIndex += 1;
      return id;
    }

    const unallocated = Array.from({ length: 15 }, addJob);
    const trips = rounds.map(function (round) {
      return {
        id: round.id,
        name: round.name,
        vehicle: round.vehicle,
        driver: round.driver,
        unsequenced: Array.from({ length: round.unsequenced }, addJob),
        sequenced: Array.from({ length: round.sequenced }, addJob)
      };
    });
    return { jobs: jobs, unallocated: unallocated, trips: trips };
  }

  window.DayBoardData = { makeInitialState: makeInitialState };
}());
