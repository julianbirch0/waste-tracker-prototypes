# WasteTracker – Round Definitions prototype

## Run it

1. Pull `julianbirch0/waste-tracker-prototypes` using GitHub Desktop, then open this folder.
2. Double-click **index.html**. That's it. No localhost, npm, framework, build step or internet connection.

## Files

- `index.html` – screen structure.
- `styles.css` – styling aligned with the current WasteTracker look and feel.
- `data.js` – **all** sample rounds and dropdown data, in plain JavaScript/JSON-like structures.
- `app.js` – all screen behaviour, validation and local save/cancel logic.

Keep all four files together. The fifth file, this README, is optional.

## Behaviour

- **Add Round** inserts a new, editable row, focuses Round Name and defaults Group to **Group 1**.
- Columns are ordered: Round Name, Day of Week, Default Vehicle, Default Material, Default Facility, Group, Action.
- **Group** options are Group 1–5 and Subcontractors. All three Default dropdowns remain enabled for Subcontractors.
- **Day of Week** allows multiple weekdays. **Monday to Friday** and **Monday to Sunday** are quick selections, stored as individual day selections. You can then untick individual days (e.g., Wednesday).
- **Round count** shows the total number of individual selected days across all rows. A blank new row does not count until a day is selected. In the production data model, selecting three days creates three distinct Round records; the prototype deliberately keeps them together as one editable row, without modelling this persistence behaviour.
- **Delete** removes a row from the draft; **Cancel** restores it if not yet saved.
- **Save** validates required Round Name and at least one Day of Week, then saves the full list in the browser's `localStorage`.
- **Cancel** rolls back all unsaved changes to the last saved version.
- **Reset sample data** (bottom left) deletes the browser's saved copy and loads the initial examples from `data.js` (after confirmation).

## A note about localStorage

Changes persist across page reloads in the **same browser and local file location** when the browser permits `localStorage` on `file://` pages. Browsers can vary in how they handle local file origins; if storage is blocked, the prototype still works in the current tab and displays a warning.

`data.js` is never written to by the browser. To make lasting changes to the *starter dataset*, edit `data.js`, then click **Reset sample data** in the prototype. Saving from the screen affects browser storage only.

## Scope consciously deferred

- Splitting a multi-day row into separate per-day records in production persistence (only the count is demonstrated here).
- Scheduling/Trip generation, Agreements, Jobs, and operational rules.
- Any further business logic around default material or facility.
- Backend integration and actual application navigation.
