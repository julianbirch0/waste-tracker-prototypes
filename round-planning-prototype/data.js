/*
 * WasteTracker – Round Planning prototype sample data.
 * Edit this file to change the initial rounds, agreements and membership.
 *
 * IMPORTANT: Individual Regular Services own Round associations.
 * Round Planning edits sequence per Service/day-specific Round, not membership.
 *
 * Everything works when index.html is opened directly via file://.
 */
window.RoundPlanningData = {
  rounds: [
    // Each scheduled day is its own round, with independent agreement sequencing.
    { id: "round-001", name: "Small Bins", days: ["Monday"] },
    { id: "round-002", name: "Skips 1", days: ["Monday"] },
    { id: "round-002-tuesday", name: "Skips 1", days: ["Tuesday"] },
    { id: "round-002-wednesday", name: "Skips 1", days: ["Wednesday"] },
    { id: "round-002-thursday", name: "Skips 1", days: ["Thursday"] },
    { id: "round-002-friday", name: "Skips 1", days: ["Friday"] },
    { id: "round-003", name: "Skips 2", days: ["Tuesday"] },
    { id: "round-004", name: "Subcontractor North", days: ["Monday"] },
    { id: "round-004-wednesday", name: "Subcontractor North", days: ["Wednesday"] },
    { id: "round-004-friday", name: "Subcontractor North", days: ["Friday"] }
  ],

  agreements: [
    {
      id: "agreement-10421", number: "10421", customer: "Acme Construction Ltd",
      site: "Riverside Development", location: "Swindon", postcode: "SN1 2ED",
      timing: "07:00 to 16:00", material: "17 09 04 – Mixed C&D",
      container: "8 yd Skip", quantity: "1", roundIds: ["round-002", "round-002-tuesday", "round-002-wednesday", "round-002-thursday", "round-002-friday"]
    },
    {
      id: "agreement-10436", number: "10436", customer: "Greenfield Property Services",
      site: "Unit 12, Industrial Estate", location: "Chippenham", postcode: "SN14 6NH",
      timing: "00:00 to 23:59", material: "17 02 01 – Wood",
      container: "6 yd Skip", quantity: "1", roundIds: ["round-002", "round-002-tuesday", "round-002-wednesday", "round-002-thursday", "round-002-friday", "round-003"]
    },
    {
      id: "agreement-10502", number: "10502", customer: "Westbury Building Group",
      site: "Station Road Works", location: "Marlborough", postcode: "SN8 1LH",
      timing: "09:00 to 15:00", material: "17 05 04 – Soil & Stones",
      container: "8 yd Skip", quantity: "2", roundIds: ["round-002", "round-002-tuesday", "round-002-wednesday", "round-002-thursday", "round-002-friday"]
    },
    {
      id: "agreement-10527", number: "10527", customer: "Parkside Retail Ltd",
      site: "Distribution Centre", location: "Swindon", postcode: "SN3 4TG",
      timing: "08:00 to 18:00", material: "15 01 06 – Mixed Packaging",
      container: "12 yd Skip", quantity: "1", roundIds: ["round-002", "round-002-tuesday", "round-002-wednesday", "round-002-thursday", "round-002-friday", "round-003"]
    },
    {
      id: "agreement-10311", number: "10311", customer: "Cotswold Offices",
      site: "Head Office", location: "Cirencester", postcode: "GL7 1PX",
      timing: "08:00 to 17:00", material: "20 03 01 – General Waste",
      container: "1100 L Wheelie Bin", quantity: "4", roundIds: ["round-001"]
    },
    {
      id: "agreement-10364", number: "10364", customer: "Ashfield Business Park",
      site: "Building B", location: "Swindon", postcode: "SN2 8XY",
      timing: "06:00 to 12:00", material: "15 01 06 – DMR",
      container: "660 L Wheelie Bin", quantity: "6", roundIds: ["round-001"]
    },
    {
      id: "agreement-10601", number: "10601", customer: "Northside Environmental",
      site: "Depot 2", location: "Gloucester", postcode: "GL1 2AF",
      timing: "00:00 to 23:59", material: "20 03 01 – General Waste",
      container: "Loose", quantity: "1", roundIds: ["round-004", "round-004-wednesday", "round-004-friday"]
    }
  ]
};


/*
 * Review-build test fixtures: Regular Activities own their Round assignments.
 * All dates and coordinates below are illustrative. A single Activity may point
 * to several DAY-SPECIFIC Round IDs that share the same Round name.
 */
(function () {
  var source = window.RoundPlanningData;
  var examples = {
    "agreement-10421": { everyWeeks:1, startDate:"2026-10-26", lat:51.559, lng:-1.779, notes:"Call site contact before arrival." },
    "agreement-10436": { everyWeeks:2, startDate:"2026-11-02", lat:51.461, lng:-2.125, notes:"Access via industrial estate gate.", initiallyUnsequenced:true },
    "agreement-10502": { everyWeeks:2, startDate:"2026-11-09", lat:51.421, lng:-1.728, notes:"Restricted access before 09:00." },
    "agreement-10527": { everyWeeks:4, startDate:"2026-11-16", lat:51.598, lng:-1.733, notes:"Check security arrangements." },
    "agreement-10311": { everyWeeks:1, startDate:"2026-10-26", lat:51.718, lng:-1.970, notes:"Use side entrance." },
    "agreement-10364": { everyWeeks:2, startDate:"2026-11-02", lat:51.572, lng:-1.804, notes:"Collection behind Building B.", initiallyUnsequenced:true },
    "agreement-10601": { everyWeeks:1, startDate:"2026-10-26", lat:51.866, lng:-2.238, notes:"Notify depot on arrival." }
  };
  source.agreements.forEach(function (a) {
    var e=examples[a.id]; if(!e)return;
    a.notes=e.notes;
    a.coordinates={lat:e.lat,lng:e.lng};
    a.initiallyUnsequenced=!!e.initiallyUnsequenced;
    a.initiallySequenced=!e.initiallyUnsequenced;
    a.activities=[{type:"regular",roundIds:a.roundIds.slice(),everyWeeks:e.everyWeeks,startDate:e.startDate}];
  });
  source.agreements.push(
    {
      id:"agreement-10618", number:"10618", customer:"Wessex Building Contractors",
      site:"Canal Road Refurbishment", location:"Devizes", postcode:"SN10 1EB",
      timing:"07:30 to 15:30", material:"17 09 04 – Mixed C&D", container:"8 yd Skip", quantity:"1",
      notes:"Site entrance adjacent to canal bridge.", coordinates:{lat:51.349,lng:-1.996},
      initiallyUnsequenced:true,
      activities:[{type:"regular",roundIds:["round-002"],everyWeeks:1,startDate:"2026-10-26"}]
    },
    {
      id:"agreement-10633", number:"10633", customer:"Pewsey Developments",
      site:"New Build Site", location:"Pewsey", postcode:"SN9 5EQ",
      timing:"08:00 to 16:00", material:"17 09 04 – Mixed C&D", container:"8 yd Skip", quantity:"1",
      notes:"Fortnightly; keep clear of school entrance.",coordinates:{lat:51.340,lng:-1.765},
      activities:[{type:"regular",roundIds:["round-002"],everyWeeks:2,startDate:"2026-11-09"}]
    },
    {
      id:"agreement-10661", number:"10661", customer:"North Wiltshire Retail",
      site:"Market Street",location:"Calne",postcode:"SN11 0EH",
      timing:"09:00 to 17:00", material:"20 03 01 – General Waste",container:"1100 L Wheelie Bin", quantity:"2",
      notes:"Service yard, rear of premises.",coordinates:{lat:51.438,lng:-2.006},
      initiallyUnsequenced:true,
      activities:[{type:"regular",roundIds:["round-001"],everyWeeks:1,startDate:"2026-10-26"}]
    },
    {
      id:"agreement-10672", number:"10672", customer:"Riverside Offices",
      site:"Business Centre",location:"Stroud",postcode:"GL5 1AU",
      timing:"07:00 to 12:00",material:"15 01 06 – DMR",container:"660 L Wheelie Bin",quantity:"3",
      notes:"Every fourth week.",coordinates:{lat:51.745,lng:-2.217},initiallySequenced:true,
      activities:[{type:"regular",roundIds:["round-001"],everyWeeks:4,startDate:"2026-11-02"}]
    }
  );
})();


/*
 * Service-sequencing sample fixtures, 19 November 2026.
 * Existing Agreements remain the commercial parent; Regular Services are the
 * individually sequenceable records. Everything below is deterministic demo
 * data, with deliberately broad coverage of every day-specific Round.
 */
(function () {
  "use strict";
  const source = window.RoundPlanningData;
  const services = [];
  const addService = (agreement, params) => {
    const ordinal = services.filter(s => s.agreementId === agreement.id).length + 1;
    const service = Object.assign({
      id: agreement.id + "/regular-" + String(ordinal).padStart(2,"0"),
      agreementId: agreement.id,
      activity: agreement.container.toLowerCase().includes("bin") ? "Empty" :
        agreement.container === "Loose" ? "Wait and Load" : "Collect",
      container: agreement.container,
      quantity: Number(agreement.quantity) || 1,
      timing: agreement.timing,
      notes: agreement.notes || "",
      roundIds: [],
      everyWeeks: 1,
      startDate: "2026-10-26",
      endDate: "",
      onHold: false,
      initiallySequenced: true
    }, params || {});
    services.push(service);
    return service;
  };
  // Preserve all the previous example Agreements but sequence their services
  // independently, including multiple Regular Services on the same Agreement.
  source.agreements.forEach(a => {
    (a.activities || []).filter(x => x.type === "regular").forEach(x => {
      addService(a,{
        roundIds: (x.roundIds || []).slice(),
        everyWeeks: x.everyWeeks || 1,
        startDate: x.startDate || "2026-10-26",
        endDate: x.endDate || "",
        onHold: !!x.onHold,
        initiallySequenced: !!a.initiallySequenced
      });
    });
  });
  const byAgreementId = id => source.agreements.find(a => a.id === id);
  // Two nearly identical, independently sequenceable Monday services under
  // one same-material Agreement, plus one future and one on-hold fixture.
  const office = byAgreementId("agreement-10311");
  addService(office,{activity:"Empty",quantity:2,roundIds:["round-001"],
    everyWeeks:2,startDate:"2026-11-02",notes:"Additional fortnightly bins."});
  addService(office,{activity:"Empty",quantity:1,roundIds:["round-001"],
    everyWeeks:1,startDate:"2026-10-26",onHold:true,notes:"Temporary hold – retain place."});
  const skips = byAgreementId("agreement-10421");
  addService(skips,{activity:"Exchange",roundIds:["round-002","round-002-thursday"],
    everyWeeks:2,startDate:"2026-10-26",notes:"A separate twice-weekly service."});
  addService(skips,{activity:"Collect",roundIds:["round-002"],everyWeeks:4,
    startDate:"2027-01-04",notes:"Future start – visible in All only."});
  // Completed historic service retained as a distinct identity but hidden
  // from the current planning views, preserving stored historic ordering.
  addService(skips,{activity:"Collect",roundIds:["round-002"],everyWeeks:1,
    startDate:"2026-10-05",endDate:"2026-11-01",notes:"Ended service."});

  const customers = [
    "Bluebell Property Group","Hillside Retail","Oakridge Contractors",
    "Pioneer Logistics","West Country Estates","Citywide Facilities",
    "Avon Construction","Horizon Business Parks","Marlborough Foods",
    "Green Acre Services","Northbank Stores","Redwood Homes",
    "Meadowfield Management","Canal Side Trading","Wessex Commercial",
    "Kingsmead Housing","Bramble Industrial","Crescent Leisure"
  ];
  const sites = [
    "Depot A","Warehouse 3","High Street Premises","South Yard",
    "Development Plot","Trading Estate","Distribution Centre",
    "North Entrance","Operations Hub","Retail Park Unit"
  ];
  const places = [
    ["Swindon","SN1 1AA",51.559,-1.782],
    ["Chippenham","SN14 0AA",51.458,-2.116],
    ["Marlborough","SN8 1AA",51.418,-1.730],
    ["Devizes","SN10 1AA",51.350,-1.995],
    ["Cirencester","GL7 1AA",51.717,-1.967],
    ["Calne","SN11 0AA",51.435,-2.005],
    ["Gloucester","GL1 1AA",51.866,-2.238],
    ["Westbury","BA13 3AA",51.260,-2.186],
    ["Pewsey","SN9 5AA",51.341,-1.764],
    ["Stroud","GL5 1AA",51.744,-2.218]
  ];
  // Each day-specific Round receives 24 extra services, including several
  // services under the same Agreement with different frequencies. This yields
  // meaningful scroll distances and bulk-drag testing on every Round/Day.
  let serial = 0;
  source.rounds.forEach((r,ri) => {
    for (let i=0;i<24;i++) {
      serial += 1;
      const location = places[(ri*3+i)%places.length];
      const bins = r.name === "Small Bins" || (i%7===0);
      const container = bins ? (i%3===0 ? "120 L Wheelie Bin" :
        i%3===1 ? "660 L Wheelie Bin" : "1100 L Wheelie Bin")
        : i%5===0 ? "Loose" : i%4===0 ? "12 yd Skip" : "8 yd Skip";
      const materials = bins
        ? ["20 03 01 – General Waste","15 01 06 – DMR","20 01 01 – Cardboard"]
        : ["17 09 04 – Mixed C&D","17 02 01 – Wood","17 05 04 – Soil & Stones"];
      const material = materials[(ri+i)%materials.length];
      // Pair up Regular Services on one Agreement; they inherit its one material.
      const pairing = i%2===1;
      const parent = pairing ? source.agreements[source.agreements.length-1] : null;
      const agreement = pairing && parent && parent.demoRound===r.id ? parent : {
        id:"agreement-demo-"+String(serial).padStart(4,"0"),
        number:String(20000+serial),
        customer:customers[(ri*5+i)%customers.length],
        site:sites[(i+ri)%sites.length],
        location:location[0],postcode:location[1],
        timing:i%4===0 ? "AM" : i%4===1 ? "PM" : "Any time",
        material,container,quantity:String(1+i%3),
        notes:i%9===0 ? "Check access with site contact." : "",
        coordinates:{lat:location[2]+((i*11)%9-4)*0.004,
          lng:location[3]+((i*7)%11-5)*0.006},
        demoRound:r.id
      };
      if (!pairing || !parent || parent.demoRound!==r.id) source.agreements.push(agreement);
      // Multiple services under this same Agreement may have the same activity
      // but a different recurrence, quantity and notes.
      addService(agreement,{
        activity:bins ? "Empty" : container==="Loose" ? "Wait and Load" :
          i%4===0 ? "Exchange" : "Collect",
        container:agreement.container,
        quantity:pairing ? 1+i%2 : Number(agreement.quantity),
        timing:agreement.timing,
        roundIds:[r.id],
        everyWeeks:i%7===0 ? 4 : i%3===0 ? 2 : 1,
        startDate:i%13===0 ? "2027-02-01" : "2026-10-26",
        onHold:i%11===0,
        initiallySequenced:i%8!==0,
        notes:i%11===0 ? "On hold – sequence retained." : agreement.notes
      });
    }
  });
  source.services = services;
})();
