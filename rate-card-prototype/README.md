# WasteTracker – Rate Card prototype

Open `index.html` directly in a desktop browser, including from a locally cloned GitHub repository (`file://`). No server, build step, framework or internet connection is required.

## Files

- `index.html` – controls, table and grouped column headings.
- `styles.css` – styling aligned with the other WasteTracker prototypes.
- `data.js` – dropdown values and sample rows.
- `app.js` – editing, group visibility and browser storage.

## Groups and columns

| Group | Columns | Visible by default |
| --- | --- | --- |
| Service | Activity, Container Type, Container Size, Material Type, Material | Yes (always) |
| Transport Charges | Per Container, Attendance | Yes (always) |
| Disposal Charges | Unit, Unit Price, Allowance | No |
| Container Rental | Charge, Charge Frequency | No |
| Wait and Load | Charge, Charge Unit | No |

The three optional groups are independently shown/hidden using checkboxes above the table. The selection persists as a separate **browser-local user display preference**, independent of Save, Cancel, and Reset sample data. In production, this would be stored as an account-level user preference.

### Charging semantics

- **Per Container** is a fixed transport/service charge per container. Four bins at the same site multiply the charge by four.
- **Attendance** is a fixed charge for the job/visit, regardless of container quantity.
- Both are monetary fields, accept ordinary numeric entry and display as GBP to two decimal places on blur.
- **Disposal Charges** retain Unit, Unit Price and Allowance; Unit defaults to **kg** for new rows and to **Item** when Container Type is **Loose** and Container Size is **Items**.
- Container Rental Charge Frequency defaults to **Weekly**; Wait and Load Charge Unit defaults to **Minute**.

## Behaviour

- Activities: Deliver, Collect, Exchange, Wait and Load, Empty (no Other).
- **No fields are disabled by Activity**. Any visible input is enabled even if no activity has been selected.
- Activity selection no longer automatically changes the container type. The user chooses Container Type independently.
- Container Size depends on Container Type; Material depends on Material Type. Changing a parent clears its dependent selection.
- Hiding a group does not erase its values, and changing groups does not alter the rate card's dirty/saved state.
- Reset on a row restores that row's last saved values; for a newly added row, it clears the row with standard unit defaults.
- Save writes the rate card to browser localStorage (when available), Cancel discards unsaved edits, and Reset sample data restores example rows without touching display preferences.
- Previous browser-stored `serviceCharge` values are migrated into the new `perContainerCharge` field when loading, preserving existing saved prices.
- All example prices are illustrative, not recommended commercial rates.

## Deferred for production / Jira

- Prevent duplicate combinations of **Activity + Container Type + Container Size + Material Type + Material** within a rate card. This is intentionally not enforced in the prototype.
- Mandatory-field rules are intentionally omitted.
- This standalone control will ultimately appear for organisation standard rates and customer-specific rates. Customer embedding and inheritance are out of scope.
- User-specific visibility preferences should be stored per account in the production application, not just in the browser.
