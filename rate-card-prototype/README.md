# WasteTracker – Rate Card prototype

Open `index.html` directly in a desktop browser, including from a locally cloned GitHub repository (`file://`). No server, build step, framework or internet connection is required.

## Files

- `index.html` – controls, table and grouped column headings.
- `styles.css` – styling aligned with the other WasteTracker prototypes.
- `data.js` – dropdown values and sample rows.
- `app.js` – editing, conditional Wait and Load cells and browser storage.

## Groups and columns

| Group | Columns |
| --- | --- |
| Service | Activity, Container Type, Container Size, Material Type, Material |
| Transport Charges | Per Container, Attendance |
| Disposal Charges | Unit, Unit Price, Allowance |
| Container Rental | Charge, Charge Frequency |
| Wait and Load | Charge, Charge Unit |

**All five groups are always visible**, followed by the Actions column. There are no group-visibility checkboxes or display preferences. The table scrolls horizontally as required.

### Charging semantics

- **Per Container** is a fixed transport/service charge per container. Four bins at the same site multiply the charge by four.
- **Attendance** is a fixed charge for the job/visit, regardless of container quantity.
- Both are monetary fields, accept ordinary numeric entry and display as GBP to two decimal places on blur.
- **Disposal Charges** retain Unit, Unit Price and Allowance; Unit defaults to **kg** for new rows and to **Item** when Container Type is **Loose** and Container Size is **Items**.
- Container Rental Charge Frequency defaults to **Weekly**; Wait and Load Charge Unit defaults to **Hour** (the explicit Minute setting on existing saved rows is preserved).

## Behaviour

- Activities: Deliver, Collect, Exchange, Wait and Load, Empty (no Other).
- No fields are disabled by Activity. All standard Rate Card inputs are enabled.
- **Wait and Load → Charge and Charge Unit** controls are only rendered when the row's Activity is **Wait and Load**. All other rows have completely empty cells in these two columns (no disabled or hidden form controls).
- Switching Activity only changes whether those controls are shown; it does not silently erase previously entered values.
- Activity selection no longer automatically changes the container type. The user chooses Container Type independently.
- Container Size depends on Container Type; Material depends on Material Type. Changing a parent clears its dependent selection.
- All dropdowns show a non-selectable `Select ...` prompt only while unselected. Once a real value is chosen, the prompt is **removed from the option list entirely**. If a parent selection changes, its dependent dropdown resets to a blank value and temporarily shows its prompt again.
- Reset on a row restores that row's last saved values; for a newly added row, it clears the row with standard unit defaults.
- Save writes the rate card to browser localStorage (when available), Cancel discards unsaved edits, and Reset sample data restores example rows.
- Previous browser-stored `serviceCharge` values are migrated into the new `perContainerCharge` field when loading, preserving existing saved prices.
- All example prices are illustrative, not recommended commercial rates.

## Deferred for production / Jira

- Prevent duplicate combinations of **Activity + Container Type + Container Size + Material Type + Material** within a rate card. This is intentionally not enforced in the prototype.
- Mandatory-field rules are intentionally omitted.
- This standalone control will ultimately appear for organisation standard rates and customer-specific rates. Customer embedding and inheritance are out of scope.
- Group visibility preferences are no longer required; all groups remain visible.
