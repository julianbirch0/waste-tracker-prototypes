/* Sample data for Day Board V00005.
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
  // Keep the containers/vehicle work consistent within each Round.
  // Unallocated is intentionally mixed because those Jobs have no Round yet.
  const activitiesByRound = {
    "skips-1": ["Collect · 10 yd skip", "Exchange · 10 yd skip", "Deliver · 10 yd skip", "Collect · 12 yd skip"],
    "skips-2": ["Exchange · 12 yd skip", "Collect · 12 yd skip", "Deliver · 14 yd skip", "Exchange · 14 yd skip"],
    "trade-1": ["Empty · 1100 L bin", "Exchange · 1100 L bin", "Collect · 1100 L bin"],
    "bins-1": ["Empty · 660 L bin", "Empty · 1100 L bin", "Exchange · 660 L bin"],
    "roros-1": ["Collect · 20 yd RoRo", "Exchange · 20 yd RoRo", "Deliver · 30 yd RoRo", "Exchange · 30 yd RoRo"],
    "skips-3": ["Collect · 8 yd skip", "Exchange · 8 yd skip", "Deliver · 10 yd skip", "Collect · 10 yd skip"],
    "recycling-1": ["Empty · 660 L recycling bin", "Empty · 1100 L recycling bin", "Exchange · 1100 L recycling bin"],
    "muck-away": ["Collect · Loose soil", "Collect · Loose hardcore", "Collect · Loose rubble"],
    "bin-deliveries": ["Deliver · 660 L bin", "Deliver · 1100 L bin", "Recover · 660 L bin", "Exchange · 1100 L bin"],
    "trade-2": ["Empty · 660 L bin", "Exchange · 660 L bin", "Collect · 660 L bin"],
    "wait-load": ["Wait and load · Loose waste", "Wait and load · 12 yd skip", "Wait and load · 14 yd skip"],
    "skips-4": ["Collect · 12 yd skip", "Exchange · 12 yd skip", "Deliver · 14 yd skip", "Collect · 14 yd skip"]
  };
  const unallocatedActivities = [
    "Collect · 10 yd skip", "Empty · 660 L bin", "Exchange · 12 yd skip",
    "Collect · 20 yd RoRo", "Deliver · 1100 L bin", "Collect · Loose soil",
    "Empty · 1100 L bin", "Exchange · 14 yd skip"
  ];

  function makeInitialState() {
    const jobs = {};
    let number = 1045;
    let sampleIndex = 0;

    function addJob(roundId) {
      const activityPool = roundId ? activitiesByRound[roundId] : unallocatedActivities;
      const id = "job-" + number;
      jobs[id] = {
        id: id,
        reference: String(number),
        customer: customers[sampleIndex % customers.length],
        detail: activityPool[(sampleIndex * 3 + Math.floor(sampleIndex / 4)) % activityPool.length],
        // Deterministic coordinates on an entirely illustrative local map.
        // Fixed per Job, so moving a Job between Trips never moves its pin.
        mapX: 100 + ((sampleIndex * 173 + (sampleIndex % 9) * 31) % 890),
        mapY: 85 + ((sampleIndex * 107 + (sampleIndex % 11) * 23) % 530)
      };
      number += 1;
      sampleIndex += 1;
      return id;
    }

    const unallocated = Array.from({ length: 15 }, function () { return addJob(null); });
    const trips = rounds.map(function (round) {
      return {
        id: round.id,
        name: round.name,
        vehicle: round.vehicle,
        driver: round.driver,
        unsequenced: Array.from({ length: round.unsequenced }, function () { return addJob(round.id); }),
        sequenced: Array.from({ length: round.sequenced }, function () { return addJob(round.id); })
      };
    });
    return { jobs: jobs, unallocated: unallocated, trips: trips };
  }

  window.DayBoardData = { makeInitialState: makeInitialState };
}());
