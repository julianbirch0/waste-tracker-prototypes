/*
 * WasteTracker - Round Definitions prototype sample data.
 * Edit this file to change the initial rows and dropdown contents.
 *
 * The JavaScript object below deliberately contains only data. It does not
 * require an API, a fetch request, or a web server to be loaded via file://.
 *
 * After the first Save, app.js uses localStorage to preserve the user's edits.
 * Click "Reset sample data" on the screen to reload the contents of this file.
 */
window.RoundPrototypeData = {
  groups: [
    "Group 1",
    "Group 2",
    "Group 3",
    "Group 4",
    "Group 5",
    "Subcontractors"
  ],

  days: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ],

  vehicles: [
    { value: "AK12DUS", label: "AK12DUS - Dustcart" },
    { value: "BB76DMR", label: "BB76DMR - Dustcart" },
    { value: "CX24SKP", label: "CX24SKP - Skip Lorry" },
    { value: "LN63BCD", label: "LN63BCD - Flatbed" }
  ],

  materials: [
    "General Waste",
    "DMR",
    "Wood",
    "Metal",
    "Plastic",
    "Glass",
    "Mixed C&D"
  ],

  facilities: [
    "RF0001",
    "RF0002",
    "RF0003"
  ],

  rounds: [
    {
      id: "round-001",
      group: "Group 1",
      name: "Small Bins",
      days: ["Monday"],
      vehicle: "AK12DUS",
      material: "General Waste",
      facility: "RF0001"
    },
    {
      id: "round-002",
      group: "Group 2",
      name: "Skips 1",
      days: ["Monday"],
      vehicle: "BB76DMR",
      material: "DMR",
      facility: "RF0002"
    },
    {
      id: "round-003",
      group: "Group 1",
      name: "Skips 2",
      days: ["Tuesday"],
      vehicle: "AK12DUS",
      material: "General Waste",
      facility: "RF0001"
    }
  ]
};
