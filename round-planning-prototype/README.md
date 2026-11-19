# WasteTracker — Round Planning prototype V00001

## Run it

Pull `main` in GitHub Desktop, then open `round-planning-prototype/index.html` in Edge or another browser.

Entirely standalone `file://` prototype: plain HTML, CSS and JavaScript. No framework, server, APIs, external libraries or network required.

## 19 November 2026: Regular Service sequencing

**The sequenceable record is a Regular Service's association with a particular day-specific Round — not an Agreement.** Each Regular Service has its own unique internal ID, even when two services have the same activity, container, site and frequency. An Agreement may contain several Regular Services. Each service appears once in each day-specific Round to which it belongs, and may have an independent position on every Round/Day.

- The table's **Service** column displays activity and recurrence/frequency; no Agreement number or technical service ID is shown.
- **View Agreement** remains unchanged as the user-facing action, opening the parent Agreement preview. The future production version should navigate to its Agreement page.
- One service with quantity 3 appears **once**, not as three sequenceable items. Services at the same customer site do **not** automatically group.
- The Agreement still represents one collection site and one waste type; multiple regular services under that Agreement inherit the same material.
- Regular Services' Round associations are defined in Agreements, never changed through Round Planning. Moving services between Rounds is **not** an action offered here.

## Round, Day, Week and sequencing

- Two synchronised copies of **Select Round**, **Select Day**, **Select Week** (above the map and above the table).
- The Round picker shows distinct parent Round names; Day shows its day-specific Round instances. First Round and first Day selected on load.
- Week choices: **All**, **Week 1 — This week**, **Week 2 — Next week**, **Week 3 — w/c...**, **Week 4 — w/c...**; weeks run Monday–Sunday.
- **All** means **all associated current and future Regular Services**, even when their next due date falls beyond four weeks. Ended services are excluded from the working view.
- Each individual Week shows services **normally due in that week**, according to their recurrence. Temporarily **On hold** services still appear where they would normally be due, with a clear indicator; putting a service on hold does not delete its sequence or generate a Job.
- **Sequence numbers are consecutive in the visible view**, including On hold services. The map shows the same visible sequence numbers. Hidden services still retain positions in the underlying master sequence.
- The master sequence is **one per day-specific Round**, not one per Week. Rearranging services in a Week view updates their position in that master sequence relative to other visible/hidden services. Existing historical IDs for ended services remain in the stored sequence.

## Selection and drag-and-drop

- **No drag handles.** Click a row to select; Ctrl-click / Cmd-click toggles rows; Shift-click selects a range. Selection may span **Unsequenced services** and **Sequenced services**, provided they belong to the same day-specific Round.
- Drag a selected row to move all selected services together in their existing relative order, including between the two sections. Dragging an unselected row begins a one-service selection.
- Section headings act as drop targets for placing services at the top of either section. A separate Unsequenced drop target is available while dragging, including when the Unsequenced section is initially empty.
- The section headings use **Unsequenced services** and **Sequenced services**.
- Rows support keyboard selection (Enter/Space) and individual movement (Alt+Up/Down). Ctrl+A while the table has focus selects all visible services. Selection clears on changing Round, Day or Week.

## Save, Discard, Undo/Redo

- **Explicit Save remains**: drag operations update a local draft only. **Undo** and **Redo** traverse individual edits within that unsaved session (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z). They reset after Save, Discard, reset or navigation.
- **Save** persists the entire day-specific Round's master sequence, including currently hidden services, using browser `localStorage`.
- **Cancel** discards the draft with confirmation. Navigating to another Round/Day/Week, or opening an Agreement, while dirty invokes **Save / Discard / Cancel**. Browser navigation/reload warns when dirty.
- Week switching after Save keeps the same master sequence and resets selection/Undo/Redo. Reset restores sample defaults.
- A new sample storage key (`wastetracker.round-planning.prototype.v3`) prevents Agreement-based sequences from the previous review build being incorrectly applied to Service IDs.

## Map, sticky areas and larger sample data

- Map is inline and can be shown/hidden. Numbered teal markers represent visible Sequenced Services; amber markers represent Unsequenced; On hold markers are muted.
- **Click a map marker** to select its Regular Service and smoothly bring its row into view in the scrollable table. Keyboard Enter/Space on a focused marker has the same action.
- The map immediately follows draft changes; rearranging services does not reset map zoom/pan. Changing Round/Day/Week re-fits the locations.
- Table has a **sticky column header** and a **sticky Unsequenced services section including its rows**, so Sequenced Services scroll beneath it. The **Save/Discard/Undo/Redo footer is fixed** to the bottom of the viewport.
- The sample now has **256 Regular Services on 131 Agreements**, approximately **25–32 active services per day-specific Round**, including same-Agreement multiple services, different frequencies, on-hold and future-start services, and an ended historic example.
- The map is still an offline **illustrative schematic**, using invented locations and straight-line connections; no actual roads or route optimisation.

## Excluded scope

This prototype does not modify real production data; call WasteTracker APIs; edit Agreement/Regular Service details or memberships; build dated Jobs or Trips; calculate road routes; or implement historical audit. The Agreements and Round Definitions prototypes remain independent. The ultimate scheduling workflow should use the stored Regular Service + day-specific Round sequence when generating each dated Trip's Jobs.
