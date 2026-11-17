/* Sample data for Day Board V00014.
   All data is invented; no calls to WasteTracker or other services. */
(function () {
  "use strict";

  // Example operational groups. In the real product these come from the
  // Round Definition setup; no integration with that screen exists yet.
  const groups = [
    { id: "skips", name: "Skips Team" },
    { id: "commercial", name: "Trade & Bins" },
    { id: "recycling", name: "Recycling & Deliveries" },
    { id: "specialist", name: "Specialist Fleet" }
  ];

  const rounds = [
    { id: "skips-1", groupId: "skips", routeCenter: [245, 165], name: "Skips 1", vehicle: "AY21 KPL", driver: "Dave Roberts", unsequenced: 2, sequenced: 17 },
    { id: "skips-2", groupId: "skips", routeCenter: [465, 165], name: "Skips 2", vehicle: "BX73 FHT", driver: "Lisa Walker", unsequenced: 1, sequenced: 14 },
    { id: "trade-1", groupId: "commercial", routeCenter: [690, 165], name: "Trade Waste 1", vehicle: "HG22 LMX", driver: "John Harris", unsequenced: 2, sequenced: 16 },
    { id: "bins-1", groupId: "commercial", routeCenter: [910, 165], name: "Bins 1", vehicle: "PK24 ZUV", driver: "Sarah Price", unsequenced: 0, sequenced: 19 },
    { id: "roros-1", groupId: "specialist", routeCenter: [245, 365], name: "RoRo 1", vehicle: "AE70 TRK", driver: "Michael Evans", unsequenced: 1, sequenced: 13 },
    { id: "skips-3", groupId: "skips", routeCenter: [465, 365], name: "Skips 3", vehicle: "GK71 YND", driver: "Tom Fisher", unsequenced: 0, sequenced: 15 },
    { id: "recycling-1", groupId: "recycling", routeCenter: [690, 365], name: "Recycling 1", vehicle: "", driver: "", unsequenced: 3, sequenced: 12 },
    { id: "muck-away", groupId: "specialist", routeCenter: [910, 365], name: "Muck Away", vehicle: "DN23 JVF", driver: "Chris Turner", unsequenced: 1, sequenced: 18 },
    { id: "bin-deliveries", groupId: "recycling", routeCenter: [245, 565], name: "Bin Deliveries", vehicle: "LE69 NBG", driver: "", unsequenced: 0, sequenced: 14 },
    { id: "trade-2", groupId: "commercial", routeCenter: [465, 565], name: "Trade Waste 2", vehicle: "MP74 ACV", driver: "Amy Taylor", unsequenced: 2, sequenced: 16 },
    { id: "wait-load", groupId: "specialist", routeCenter: [690, 565], name: "Wait and Load", vehicle: "", driver: "Peter Lewis", unsequenced: 0, sequenced: 11 },
    { id: "skips-4", groupId: "skips", routeCenter: [910, 565], name: "Skips 4", vehicle: "BX73 FHT", driver: "Lisa Walker", unsequenced: 1, sequenced: 15 }
  ];

  // All available drivers, whether assigned to zero, one or several Trips.
  // Lisa intentionally covers two Trips in the demonstration; Ben and the
  // additional staff below are unassigned and available to allocate.
  const drivers = [
    "Amy Taylor", "Ben Clarke", "Charlotte Reed", "Chris Turner",
    "Dave Roberts", "James Patel", "John Harris", "Lisa Walker",
    "Michael Evans", "Olivia Moore", "Peter Lewis", "Sarah Price",
    "Sophie Bennett", "Tom Fisher"
  ];

  // Vehicle pool is independent of Trip assignment. BX73 FHT is intentionally
  // assigned to two Trips; vehicles not currently on a Trip remain available.
  const vehicles = [
    "AE70 TRK", "AY21 KPL", "BX73 FHT", "CF22 GHB", "DN23 JVF",
    "GK71 YND", "HG22 LMX", "JL25 RPN", "LE69 NBG", "MP74 ACV",
    "NR23 VSD", "PK24 ZUV", "RD72 HBE", "TU20 FKM"
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

  // Locations are intentionally schematic, but the order is not random.
  // Each Round follows a compact five-across serpentine sweep: nearby Jobs
  // follow nearby Jobs, as they would after Round Planning. Unsequenced and
  // Unallocated work is near plausible insertion points on those routes.
  function routePoint(round, index) {
    const row = Math.floor(index / 5);
    const column = row % 2 ? 4 - (index % 5) : index % 5;
    const jitterX = ((index * 5 + round.routeCenter[0]) % 7) - 3;
    const jitterY = ((index * 3 + round.routeCenter[1]) % 7) - 3;
    return {
      x: round.routeCenter[0] + (column - 2) * 37 + jitterX,
      y: round.routeCenter[1] + (row - 1.5) * 38 + jitterY
    };
  }

  function makeInitialState(dateKey) {
    // Dated Trip/Job IDs distinguish repeated instances of the same Round
    // across days. Without a dateKey the legacy fixture IDs remain available.
    const suffix = dateKey ? "@" + dateKey : "";
    const jobs = {};
    let number = 1045;
    let sampleIndex = 0;

    function addJob(roundId, point, targetRoundId) {
      const activityRound = roundId || targetRoundId;
      const activityPool = activityRound
        ? activitiesByRound[activityRound]
        : unallocatedActivities;
      const id = "job-" + number + suffix;
      jobs[id] = {
        id: id,
        reference: String(number),
        customer: customers[sampleIndex % customers.length],
        detail: activityPool[(sampleIndex * 3 + Math.floor(sampleIndex / 4)) % activityPool.length],
        status: "planned",
        // Fixed illustrative coordinates. Reallocation never moves a pin.
        mapX: point.x,
        mapY: point.y
      };
      number += 1;
      sampleIndex += 1;
      return id;
    }

    const roundsById = Object.fromEntries(rounds.map(function (round) {
      return [round.id, round];
    }));
    // Fifteen real-world-looking gaps in the existing routes. The waste type
    // matches the suggested Round, but no allocation is assigned yet.
    const allocationTargets = [
      "skips-1", "skips-2", "trade-1", "bins-1", "roros-1",
      "skips-3", "recycling-1", "muck-away", "bin-deliveries", "trade-2",
      "wait-load", "skips-4", "skips-1", "trade-2", "muck-away"
    ];
    const unallocated = allocationTargets.map(function (roundId, i) {
      const round = roundsById[roundId];
      const anchor = 2 + ((i * 5 + 3) % Math.max(1, round.sequenced - 3));
      const point = routePoint(round, anchor);
      return addJob(null, {
        x: point.x + (i % 2 ? 13 : -13),
        y: point.y + (i % 3 ? -16 : 16)
      }, roundId);
    });

    const trips = rounds.map(function (round) {
      const unsequenced = Array.from({ length: round.unsequenced }, function (_, i) {
        const index = Math.round((i + 1) * (round.sequenced - 1) / (round.unsequenced + 1));
        const point = routePoint(round, index);
        return addJob(round.id, {
          x: point.x + (i % 2 ? -16 : 16),
          y: point.y + (i % 2 ? 16 : -16)
        });
      });
      const sequenced = Array.from({ length: round.sequenced }, function (_, i) {
        return addJob(round.id, routePoint(round, i));
      });
      return {
        id: round.id + suffix,
        roundId: round.id,
        date: dateKey || "",
        name: round.name,
        groupId: round.groupId,
        vehicle: round.vehicle,
        driver: round.driver,
        unsequenced: unsequenced,
        sequenced: sequenced
      };
    });
    return { groups: groups.map(function (group) { return Object.assign({}, group); }),
      jobs: jobs, unallocated: unallocated, trips: trips };
  }

  window.DayBoardData = { groups: groups, drivers: drivers, vehicles: vehicles, makeInitialState: makeInitialState };
}());
