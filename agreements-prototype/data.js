/* Sample data deliberately kept separate from the screen behaviour. */
/* Dropdown options match rate-card-prototype/data.js at creation. */
window.AgreementPrototypeData = {
  containerSizes: {
    "Skip": ["10 yd", "12 yd", "14 yd"],
    "Bin": ["660 litres", "1100 litres"],
    "Loose": ["1/4 load", "1/2 load", "3/4 load", "Full load", "Items"]
  },
  materialTypes: ["Waste", "Non-waste"],
  materials: {
    "Waste": [
      "General Waste", "Mixed Recycling", "Wood", "Plasterboard",
      "Hardcore / Rubble", "Green Waste", "Scrap Metal",
      "Cardboard", "Soil", "Mixed Construction Waste", "Tyres"
    ],
    "Non-waste": ["Gravel", "Sand", "Boxes", "Hanging Garments", "Furniture"]
  },
  // Service choices match the Rate Card, plus Other for agreement-specific work.
  services: ["Deliver", "Collect", "Exchange", "Wait and Load", "Empty", "Other"],
  serviceTypes: ["Regular, recurring", "Ad hoc and one-off"],
  timingOptions: ["Any time", "Morning", "Afternoon", "Specific time"],
  // Parent Round names only: day-specific instances are deliberately not
  // displayed in the Agreement selector. Production will validate whether a
  // selected Round operates on the Job date; left for the Jira requirements.
  rounds: [
    { id: "parent-round-001", name: "Small Bins" },
    { id: "parent-round-002", name: "Skips 1" },
    { id: "parent-round-003", name: "Skips 2" },
    { id: "parent-round-004", name: "Subcontractor North" }
  ],

  // Illustrative rate fixtures. Single Price represents the Rate Card's
  // Per Container charge for this iteration; disposal/rental/wait charges
  // are not being calculated here. This prototype does not edit live rates.
  // Deliver deliberately omits the material because it is not used in
  // the Rate Card's Deliver activity.
  standardRates: [
    { service: "Deliver", containerType: "Skip", containerSize: "10 yd", price: "45.00" },
    { service: "Collect", containerType: "Skip", containerSize: "10 yd", materialType: "Waste", material: "General Waste", price: "120.00" },
    { service: "Exchange", containerType: "Skip", containerSize: "12 yd", materialType: "Waste", material: "Mixed Construction Waste", price: "135.00" },
    { service: "Deliver", containerType: "Bin", containerSize: "660 litres", price: "15.00" },
    { service: "Empty", containerType: "Bin", containerSize: "1100 litres", materialType: "Waste", material: "General Waste", price: "18.00" },
    { service: "Wait and Load", containerType: "Loose", containerSize: "1/2 load", materialType: "Waste", material: "Mixed Construction Waste", price: "80.00" },
    { service: "Wait and Load", containerType: "Loose", containerSize: "Items", materialType: "Non-waste", material: "Furniture", price: "40.00" }
  ],
  customerRates: [
    { service: "Collect", containerType: "Skip", containerSize: "10 yd", materialType: "Waste", material: "General Waste", price: "110.00" },
    { service: "Exchange", containerType: "Skip", containerSize: "12 yd", materialType: "Waste", material: "Mixed Construction Waste", price: "125.00" }
  ],
  customer: {
    type: "Business",
    name: "Oakfield Construction Ltd",
    site: "Oakfield Business Park – Phase 2",
    notes: "Please quote the customer purchase order number on all invoices.",
    siteNotes: "Use the south entrance. Report to the site office before entering the works area."
  },
  existingAgreement: {
    containerType: "Skip",
    containerSize: "10 yd",
    materialType: "Waste",
    material: "General Waste"
  },
  /* Example services only appear on a fresh Edit agreement prototype.
     Their dates are relative to today. Actual user saves in localStorage win. */
  demoServices: [
    {
      id: "demo-recurring-1", service: "Collect", serviceType: "Regular, recurring",
      startDaysFromToday: -35, endDate: "",
      recurrence: { basis: "weekly", every: 1, weekdays: [1, 4],
        monthMethod: "weekday", ordinal: 1, weekday: 1, monthDay: 1,
        saturdayShift: 0, sundayShift: 0 },
      quantity: 2, timing: "Morning", roundId: "parent-round-002", roundName: "Skips 1",
      jobNotes: "Call site office before visiting", price: "110.00", rateSource: "Customer rate", onHold: false
    },
    {
      id: "demo-adhoc-future", service: "Collect", serviceType: "Ad hoc and one-off",
      jobDaysFromToday: 9, quantity: 1, timing: "Any time",
      roundId: "parent-round-002", roundName: "Skips 1",
      jobNotes: "Use south entrance", price: "110.00", rateSource: "Customer rate",
      jobId: "JOB-10522"
    },
    {
      id: "demo-adhoc-past", service: "Deliver", serviceType: "Ad hoc and one-off",
      jobDaysFromToday: -12, quantity: 1, timing: "Afternoon",
      roundId: "unallocated", roundName: "Unallocated",
      jobNotes: "", price: "45.00", rateSource: "Standard rate",
      jobId: "JOB-10468"
    }
  ],
  /* Offsets keep the illustrative Planned/Completed dates relevant over time. */
  jobs: [
    { status: "Planned", id: "JOB-10482", service: "Collect", serviceId: "demo-recurring-1", daysFromToday: -2 },
    { status: "Planned", id: "JOB-10482A", service: "Collect", daysFromToday: 6 },
    { status: "Planned", id: "JOB-10483", service: "Exchange", daysFromToday: 13 },
    { status: "Completed", id: "JOB-10479", service: "Exchange", daysFromToday: -5 },
    { status: "Completed", id: "JOB-10475", service: "Deliver", daysFromToday: -15 }
  ]
};
