# Agreements prototype – v0.0001

A self-contained first-pass WasteTracker Carrier Agreement screen.

## Run locally

Pull the latest main branch in GitHub Desktop and open agreements-prototype/index.html directly in a browser. No server, installation, libraries or build tools are required.

By default the prototype displays an existing agreement with illustrative jobs (subtitle: Edit agreement). To preview the brand-new agreement state (subtitle: Add agreement), open index.html?mode=new in the browser. In the new-agreement state, the four dropdowns are blank and the Jobs table has no rows.

## Initial scope

- Left-aligned Agreement title and Add agreement / Edit agreement subtitle, with Save and Cancel at top right, aligned with the title.
- Read-only customer type (Business), customer name and site name in a single row, then customer notes and site notes beneath.
- Four editable dropdowns in one row: Container type, Container size, Material type, Material.
- Dropdown choices copied from rate-card-prototype/data.js (11 November 2026). Container size depends on container type; Material depends on material type.
- Services section starts genuinely blank with an Add service button. Clicking it displays a placeholder explanation only; no service data model or editor is invented yet.
- Jobs section shows sample Planned and Completed jobs in a table with Status, Job ID, Service and Job date. Dates are relative to the current day to keep demo examples sensible.

## Prototype-only Save and Cancel

Save stores the four selected dropdown values in this browser's localStorage, separately for Add and Edit previews. Cancel restores the last saved values. Neither action navigates away or changes any backend data; this is deliberate while the screen's workflow is being defined.

## Files

- index.html – page layout
- styles.css – restrained grey WasteTracker styling (no zebra striping)
- data.js – fictional customer, agreement, jobs and dropdown dictionaries
- app.js – basic form behaviour and sample table rendering

No rate card pricing or Regular Activity logic is included yet. These belong to subsequent iterations.
