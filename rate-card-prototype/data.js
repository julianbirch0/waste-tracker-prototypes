/* Sample data and dropdown choices, deliberately separate from app.js. */
window.RateCardPrototypeData = {
  activities: ["Deliver", "Collect", "Exchange", "Wait and Load", "Empty"],
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
  weightUnits: ["gram", "kg", "tonne", "Item"],
  rentalFrequencies: ["Daily", "Weekly", "Monthly"],
  waitUnits: ["Minute", "Hour"],
  rows: [
    {
      id: "sample-1", activity: "Deliver", containerType: "Skip", containerSize: "10 yd",
      serviceCharge: "45.00", rentalCharge: "12.00", rentalFrequency: "Weekly"
    },
    {
      id: "sample-2", activity: "Collect", containerType: "Skip", containerSize: "10 yd",
      materialType: "Waste", material: "General Waste", serviceCharge: "120.00",
      weightUnit: "tonne", weightUnitPrice: "145.00", weightAllowance: "1"
    },
    {
      id: "sample-3", activity: "Exchange", containerType: "Skip", containerSize: "12 yd",
      materialType: "Waste", material: "Mixed Construction Waste", serviceCharge: "135.00",
      weightUnit: "tonne", weightUnitPrice: "150.00", weightAllowance: "1.5"
    },
    {
      id: "sample-4", activity: "Deliver", containerType: "Bin", containerSize: "660 litres",
      serviceCharge: "15.00", rentalCharge: "5.00", rentalFrequency: "Weekly"
    },
    {
      id: "sample-5", activity: "Empty", containerType: "Bin", containerSize: "1100 litres",
      materialType: "Waste", material: "General Waste", serviceCharge: "18.00",
      weightUnit: "kg", weightUnitPrice: "0.12", weightAllowance: "100",
      waitCharge: "0.50", waitUnit: "Minute"
    },
    {
      id: "sample-6", activity: "Wait and Load", containerType: "Loose", containerSize: "1/2 load",
      materialType: "Waste", material: "Mixed Construction Waste", serviceCharge: "80.00",
      weightUnit: "tonne", weightUnitPrice: "150.00", weightAllowance: "0.5",
      waitCharge: "2.00", waitUnit: "Minute"
    },
    {
      id: "sample-7", activity: "Wait and Load", containerType: "Loose", containerSize: "Items",
      materialType: "Non-waste", material: "Furniture", serviceCharge: "40.00",
      weightUnit: "Item", weightUnitPrice: "0.30", weightAllowance: "0",
      waitCharge: "90.00", waitUnit: "Hour"
    }
  ]
};
