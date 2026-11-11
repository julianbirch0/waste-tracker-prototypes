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
