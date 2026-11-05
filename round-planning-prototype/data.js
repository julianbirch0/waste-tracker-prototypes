/*
 * WasteTracker – Round Planning prototype sample data.
 * Edit this file to change the initial rounds, agreements and membership.
 *
 * IMPORTANT: An Agreement's roundIds determines WHICH rounds it belongs to.
 * Round Planning must NOT edit membership; it stores only sequence per round.
 *
 * Everything works when index.html is opened directly via file://.
 */
window.RoundPlanningData = {
  rounds: [
    { id: "round-001", name: "Small Bins", days: ["Monday"] },
    { id: "round-002", name: "Skips 1", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
    { id: "round-003", name: "Skips 2", days: ["Tuesday"] },
    { id: "round-004", name: "Subcontractor North", days: ["Monday", "Wednesday", "Friday"] }
  ],

  agreements: [
    {
      id: "agreement-10421", number: "10421", customer: "Acme Construction Ltd",
      site: "Riverside Development", location: "Swindon", postcode: "SN1 2ED",
      timing: "07:00 to 16:00", material: "17 09 04 – Mixed C&D",
      container: "8 yd Skip", quantity: "1", roundIds: ["round-002"]
    },
    {
      id: "agreement-10436", number: "10436", customer: "Greenfield Property Services",
      site: "Unit 12, Industrial Estate", location: "Chippenham", postcode: "SN14 6NH",
      timing: "00:00 to 23:59", material: "17 02 01 – Wood",
      container: "6 yd Skip", quantity: "1", roundIds: ["round-002", "round-003"]
    },
    {
      id: "agreement-10502", number: "10502", customer: "Westbury Building Group",
      site: "Station Road Works", location: "Marlborough", postcode: "SN8 1LH",
      timing: "09:00 to 15:00", material: "17 05 04 – Soil & Stones",
      container: "8 yd Skip", quantity: "2", roundIds: ["round-002"]
    },
    {
      id: "agreement-10527", number: "10527", customer: "Parkside Retail Ltd",
      site: "Distribution Centre", location: "Swindon", postcode: "SN3 4TG",
      timing: "08:00 to 18:00", material: "15 01 06 – Mixed Packaging",
      container: "12 yd Skip", quantity: "1", roundIds: ["round-002", "round-003"]
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
      container: "Loose", quantity: "1", roundIds: ["round-004"]
    }
  ]
};
