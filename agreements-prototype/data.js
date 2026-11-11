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
  // Matching day-specific Round IDs/names from round-planning-prototype/data.js.
  // One-off services can also be intentionally left Unallocated.
  rounds: [
    { id: "round-001", name: "Small Bins", day: "Monday" },
    { id: "round-002", name: "Skips 1", day: "Monday" },
    { id: "round-002-tuesday", name: "Skips 1", day: "Tuesday" },
    { id: "round-002-wednesday", name: "Skips 1", day: "Wednesday" },
    { id: "round-002-thursday", name: "Skips 1", day: "Thursday" },
    { id: "round-002-friday", name: "Skips 1", day: "Friday" },
    { id: "round-003", name: "Skips 2", day: "Tuesday" },
    { id: "round-004", name: "Subcontractor North", day: "Monday" },
    { id: "round-004-wednesday", name: "Subcontractor North", day: "Wednesday" },
    { id: "round-004-friday", name: "Subcontractor North", day: "Friday" }
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
  /* Offsets keep the illustrative Planned/Completed dates relevant over time. */
  jobs: [
    { status: "Planned", id: "JOB-10482", service: "Collect", daysFromToday: 6 },
    { status: "Planned", id: "JOB-10483", service: "Exchange", daysFromToday: 13 },
    { status: "Completed", id: "JOB-10479", service: "Exchange", daysFromToday: -5 },
    { status: "Completed", id: "JOB-10475", service: "Deliver", daysFromToday: -15 }
  ]
};
