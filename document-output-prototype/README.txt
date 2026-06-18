WasteTracker Document Output Prototype
=====================================

Purpose
-------
This is a rapid prototyping tool for WasteTracker report/document layouts.

It is intentionally not production code.

Current prototype
-----------------
This first version renders:

- Repeatable header
- Repeatable footer
- Header logo upload
- Footer logo upload
- Broker company name and address/contact details
- WasteTracker strapline
- Placeholder body area

How to use
----------
Open index.html in a browser.

Paste or edit the JSON in the left-hand panel, then click Render.

Use the two logo file inputs to test different header and footer logos.

Use Print / Save as PDF to test basic browser PDF output.

JSON structure
--------------
{
  "broker": {
    "companyName": "Example Waste Broker Ltd",
    "addressLine1": "Example House",
    "addressLine2": "1 Example Road",
    "addressLine3": "Example Town",
    "addressLine4": "",
    "postcode": "EX1 2AB",
    "phoneNumber": "01234 567890",
    "emailAddress": "ops@examplebroker.co.uk"
  },
  "footer": {
    "wasteTrackerStrapline": "WasteTracker - simple, compliant digital waste tracking"
  }
}

Notes
-----
Blank broker address fields are skipped, so addressLine4 can be blank without leaving an empty line.

Logo boxes reserve a fixed space. Uploaded logos are scaled to fit without distortion or cropping.
