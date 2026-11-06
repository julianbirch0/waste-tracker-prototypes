# WasteTracker – Round Planning prototype

## Run it

Pull `main` in GitHub Desktop, then open `round-planning-prototype/index.html` in a browser.

The prototype uses plain `index.html`, `styles.css`, `data.js` and `app.js`. It works directly from `file://` without a web server, framework, CDN, build step or internet connection.

## 6 November 2026 review build

### Round, Day and Week

- There are **two synchronised copies** of the **Select Round | Select Day | Select Week** controls: one above the inline map and one between the map and Agreement table.
- The first Round name and its first scheduled Day are selected on load; **Week 1 - This week** is initially selected.
- Week options: **All**, **Week 1 - This week**, **Week 2 - Next week**, **Week 3 - w/c d-mmm**, **Week 4 - w/c d-mmm**. Weeks run Monday–Sunday. `All` means the current week and next three weeks.
- Changing Round retains the selected Day if that Round exists for the Day; otherwise it picks the first available Day. Changing Round or Day retains the selected Week.
- A single named Round can have multiple day-specific Round records, each with its own master sequence.
- The displayed Agreements are derived from qualifying **Regular Activities** attached to each Agreement. Ad hoc Activities do not make an Agreement eligible. Each Agreement appears **once** in the selected view, even if it is due multiple times in the four-week window.

### Sequencing and filtering

- There is **one master Agreement sequence per day-specific Round**, not a separate sequence for every Week.
- Week filtering hides Agreements not due in the selected Week.
- Users can drag rows while viewing an individual Week. Dropping below a visible Agreement inserts immediately after it in the master sequence, even if previously hidden Agreements lie between them. Dropping before the first visible scheduled Agreement places it at master position 1.
- **Unsequenced agreements** are grouped at the top in muted orange, followed by **Scheduled agreements** in the existing row colour. The section dividers appear only if at least one unsequenced Agreement is visible.
- Dragging within Unsequenced leaves Agreements unsequenced. Dragging across to Scheduled assigns a sequence. Dragging back to Unsequenced removes it. A drop area appears while dragging so the reverse is possible even when every Agreement was previously scheduled.
- Saving while there are Unsequenced Agreements is allowed. Sequence persists through browser `localStorage`. Reset returns to the sample defaults.
- Newly associated/due Agreements default to Unsequenced unless explicitly marked as pre-sequenced **demo fixtures** in `data.js`.

### Map

- Map is **inline**, above the table, shown by default. Hide/Show persists when changing Round, Day or Week during the open session.
- Only Agreements allocated to the selected Round and due for the selected Week/All are plotted. **Unallocated** Agreements are not shown.
- Scheduled Agreements have numbered teal markers connected by **straight line segments** in master sequence order. Unsequenced Agreements have separate amber unnumbered markers and are **not** connected.
- The map updates immediately when rows are moved, even before Save. Discard restores the saved sequence and map.
- Switching Round, Day or Week fits the current locations. Drag-and-drop doesn't reset the current map zoom/pan.
- The offline map is a **schematic location visualisation using illustrative sample coordinates**. It is **not** a Google Maps/OSM road map, and no routing or route optimisation is performed.

### Other controls

- Agreement **Notes** are in the table, with a **View columns** dropdown that can show/hide Notes and several other columns.
- **View Agreement** opens the existing lightweight detail preview. The Agreement editor is not built yet; intended return-to-planning behaviour is described but cannot be demonstrated until that screen exists.
- If there are unsaved sequencing changes, selecting another Round/Day/Week or opening an Agreement invokes the **Save / Discard / Cancel** dialogue. The browser's unsaved-page prompt applies on close/reload.
- **Cancel** on the screen discards changes to the currently selected Round sequence.

## Data model and deliberately excluded scope

`data.js` is editable sample data. `activities` on an Agreement define which day-specific Round IDs it belongs to and its recurrence (`everyWeeks`, `startDate`, optional `endDate`). The same Activity may refer to multiple day-specific Rounds of the same named Round; distinct Activities can target different named Rounds. Round Planning **does not add/remove Activity–Round associations**; these are maintained in the future Agreement editor.

The data and map are demonstrative, not production records. The prototype does **not** build Jobs or Trips, perform backend scheduling, prevent duplicate/overlapping Activities, manage Agreement closure, implement the true Agreements editor or integrate with Round Definitions. These require subsequent work.

Browser storage is scoped to the same local file origin where supported. Save doesn't change `data.js` or GitHub. The review build uses a new `localStorage` key (`wastetracker.round-planning.prototype.v2`) so earlier sample sequences aren't unintentionally applied to the new test fixtures.
