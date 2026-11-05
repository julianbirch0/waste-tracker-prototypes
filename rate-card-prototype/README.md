# WasteTracker – Rate Card prototype

Open \`index.html\` directly in a desktop browser, including from a locally cloned GitHub repository (\`file://\`). No web server, build step, framework or internet connection is needed.

## Files

- \`index.html\` – standalone screen and grouped table headings.
- \`styles.css\` – styling aligned with the other WasteTracker prototypes.
- \`data.js\` – editable dropdown options and sample rows.
- \`app.js\` – activity-dependent rules, editing and browser storage.

## Behaviour

- Groups: **Service** (Activity, Container Type, Container Size, Material Type, Material, Charge); **Weight** (Unit, Unit Price, Allowance); **Container Rental** (Charge, Charge Frequency); **Wait and Load** (Charge, Charge Unit).
- Activities: Deliver, Collect, Exchange, Wait and Load, Empty (no Other).
- **Deliver**: Material Type, Material, Weight and Wait and Load disabled; Container Rental enabled.
- **Collect / Exchange**: Container Rental and Wait and Load disabled; Weight enabled.
- **Wait and Load / Empty**: Container Rental disabled; Weight and Wait and Load enabled.
- Service Charge is always available.
- On activity change, every field becoming disabled is **cleared**. Re-enabling a previously disabled field does not restore its previous value.
- First activity selection on a new row sets applicable unit defaults: kg, Weekly and Minute. New rows start with no Activity selected.
- Container Size depends on Container Type; Material depends on Material Type. Changing either parent clears its child.
- Financial inputs accept plain values and display as pounds with two decimal places when leaving the field.
- Weight Allowance is a number in the chosen weight unit. No automatic conversions between weight or time units.
- Reset on a row restores that row's last saved values; on a newly added row it clears that row.
- Save writes to browser localStorage (when available); Cancel discards unsaved edits; Reset sample data restores original examples.

## Deferred for production / Jira

- Prevent duplicate combinations of **Activity + Container Type + Container Size + Material Type + Material** *within the same rate card*. Intentionally **not enforced in prototype**.
- Mandatory-field rules are intentionally omitted.
- This standalone control will ultimately appear for organisation standard rates and customer-specific rates. Customer embedding and inheritance are out of scope.

All sample prices are illustrative, not recommended commercial rates.
