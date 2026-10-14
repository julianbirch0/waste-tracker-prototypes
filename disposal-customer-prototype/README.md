# Disposal Customer prototype (V3)

A clickable WasteTracker **Disposal Customer / Carrier** maintenance screen.

## Running it

1. In GitHub Desktop, fetch/pull the latest **main** of **julianbirch0/waste-tracker-prototypes**.
2. Browse to **disposal-customer-prototype**.
3. **Double-click index.html** to open it in your browser.

No npm, no localhost, no server, no framework, no third-party libraries, no internet connectivity. The three files (index.html, styles.css, app.js) sit together.

## V2 changes (following snagging)

- The Customer/Carrier **form is now the main page**, not a split-screen editor and customer list.
- Fictional sample customers remain accessible **below the form**, after a deliberately unmistakable **End of Customer Form / Prototype Test Area** separator. This is a test harness, not proposed functionality on the production customer screen.
- Choosing **Domestic** never displays any carrier registration, waste carrier licence expiry, or registered broker/dealer fields. Domestic still supports associated vehicles, as agreed.
- Choosing a sample customer scrolls back to the form so the selected record is immediately visible.

## V3 changes (address lookup and keyboard focus)

- Clicking **Domestic** immediately places keyboard focus in the Customer Name field.
- The address area starts with a free-text **Find address** box, **Search**, and **Enter address manually**.
- Typing **SN1 1AA** and searching yields **one** fictional result, filling the four address fields.
- Typing **Castlefields Shrewsbury** yields **multiple** fictional matches; select one or choose **None of the above**. That dismisses the choices without selecting an address.
- Typing text not in the sample data yields **no matches**, with an option to retry or enter manually.
- **Enter address manually** shows all four address fields **empty**, including when changing an existing record.
- The **Postcode is mandatory** even if lookup fails or is bypassed. Trying to save without it reveals the address fields and focuses Postcode for correction.
- Existing example customers display their stored address automatically when opened for editing.
- This is an **offline address-lookup simulation**, not a live PAF/AddressNow provider integration. It is intended to demonstrate interaction and conditional display on `file://` without localhost or any server.

## What to try

- Choose **Domestic** or **Commercial** in the form. To start again, use **Start a new customer form** in the separate sample-records area below.
- For **Commercial**, choose **Carrier only**, **Originator only** or **Both**.
- For commercial originators, switch between **Ordinary commercial originator** and **Registered broker or dealer** to reveal registration requirements.
- Try ticket preferences. **Show prices** is fixed on for Domestic, fixed off for Carrier only, and editable for Originator only / Both. **Show notes** is editable.
- Select **ABC Haulage** and **Westbrook Recycling**. Both have vehicle **B16 SKP**. This is intentional: the same registration can be associated with different carriers.
- Within a single carrier, try adding **B16SKP** when **B16 SKP** is already associated. The prototype blocks the duplicate, ignoring spaces and case.
- Add/edit/remove vehicles, choose a vehicle type, toggle **Favourite**, and click **Create Intake**. This saves the customer in the demo and previews the next step; there is no Intake form in this prototype.
- Try **Save customer** with a missing name/postcode or missing registration for a registered broker/dealer. Then try a valid save.
- Try **Reset demo data** to restore fictional examples.

## Important prototype constraints

- Records are **entirely fictional**, using the reserved .example domain for sample email addresses.
- Data lives **only in browser memory**. It resets on refresh or closing the tab, or via the reset button. It never touches WasteTracker's database.
- No DEFRA calls, live geocoding or address-lookup provider, printing, real permissions or real Intake Loads. Address results are deliberately fictional and stored in app.js.
- The sidebar is non-functional scenery. Only customer maintenance and the mock Intake hand-off are intended to work.
- The original spacing and case of vehicle registrations are preserved. Duplicate comparisons remove spaces and ignore case; there is no partial-match search.
- Demo vehicle types are illustrative and do **not** assert which vehicle types the live organisation has configured.
- Licence expiry dates are optional and are **not** enforced, warned about, or verified against public carrier registers.
- Customer roles are independent of the regulatory broker/dealer classification. Domestic customers implicitly serve as both carrier and originator.
- A commercial **Carrier + Originator** record does **not** imply the originator is automatically populated during Intake.
- The role/category of a customer can be edited for exploration in V1; the handling of existing records that change roles requires real implementation design.
- Existing vehicle associations remain in browser memory if you temporarily switch a customer to Originator only, but are hidden while that role cannot act as a carrier. Production behaviour for role changes needs agreement.

## Decisions reflected in this prototype

- WasteTracker's chosen terminology: **Domestic** and **Commercial** (not a direct pair of DEFRA API classifications).
- Commercial roles: **Carrier only**, **Originator only**, **Both**.
- A business originator can be ordinary/unregistered or a registered broker/dealer.
- A registered broker/dealer has registration number and optional expiry date fields; carriers also have optional expiry dates.
- Vehicles are stored as associations within the receiving organisation's private customer records: one registration may legitimately appear on multiple carriers.
- Favourite status attaches to the **vehicle + carrier** pair.
- Ticket price preference is fixed based on customer classification as described above; the separate ticket-level rule suppressing prices for a carrier when the originator differs will be enforced when the Intake/ticket prototype is designed.
- The vehicle **Create Intake** action represents the future shortcut from customer maintenance to a new Intake Load, after saving customer changes.

## Decisions deliberately not disguised as finished functionality

- Detailed mandatory field rules for various customer relationships remain under review (R-004). V1 demonstrates **name and postcode required** plus **broker/dealer registration required**, and basic email syntax; these are prototype validation examples, not an assertion that every production validation rule is final.
- The existing UI's actual data schema, input permissions, field naming and DEFRA mapping have not been connected or verified.
- Customer invoice contact email handling (R-005) remains open and is **not** silently added here.
- Originator selection / same-as-carrier transactions are part of the subsequent Intake Load prototype.
- No attempt to replicate the entire existing Transport customer screen. Disposal should expose only fields with a Disposal purpose.

## Files

- **index.html** — semantic form, choices, dialogs, sample navigation
- **styles.css** — responsive visual styling, no dependencies
- **app.js** — demo records, conditional form, client-side validation, favourites and simulated hand-off
