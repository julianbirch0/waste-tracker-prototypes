# Day Board prototype — V00003

A standalone, local-file-friendly WasteTracker Day Board prototype.

## Run it

1. Pull the latest **main** branch using GitHub Desktop.
2. Open the **day-board-prototype** folder in your local checkout.
3. Double-click **index.html** to open it in Edge or Chrome.

There is **no localhost, build step, framework, CDN or web service**. Keep index.html, styles.css, data.js and app.js in the same folder.

## What is included

- 12 Trip columns, each showing the **parent Round name only**, with Vehicle and Driver displayed as read-only text.
- A **horizontally sticky Unallocated column** on the left.
- Trip headers that remain visible when scrolling vertically.
- An **always-visible sticky Unsequenced area** immediately below each Trip header, including a compact empty drop target when there are no unsequenced Jobs.
- A horizontal scrollbar at the **bottom of the board's fixed-height scrolling area**, always accessible while scrolling up/down through Jobs.
- One shared vertical scroll for every column.
- **Click a Job card once to select it** (prominent, 4 px teal border). **Press it again and drag anywhere on the selected card** to lift it. Selection and dragging are deliberately separate gestures, so the first click cannot accidentally move a Job. The card stays fully opaque under your pointer, while a full-sized gap moves through the list and neighbouring cards slide smoothly out of its way. Drop within a Trip, between Trips, into or out of Unsequenced, or back to Unallocated.
- Selecting a different card moves the selection; clicking empty board space or pressing **Escape** clears it. Selection remains on the moved Job after drop. Selection does not change the Job data or create an Undo step.
- A muted amber Unsequenced treatment; otherwise neutral cards.
- Round-specific sample work: skip Rounds show skips, bin Rounds show bins, RoRo shows RoRos, Muck Away shows loose loads, and so on. Unallocated remains mixed.
- Subtle sequence positions (**01**, **02**, etc.) which are distinct from the Job reference and recalculated after each move.
- Immediate application of each move, without Save/Discard.
- Multiple levels of **Undo/Redo** (up to 100 moves), with a brief confirmation toast.
- Shortcuts: **Ctrl+Z** (Undo), **Ctrl+Y** or **Ctrl+Shift+Z** (Redo).
- Invented sample data: **208 Jobs** across **12 Trips** and **15 initially Unallocated Jobs**. There are enough Jobs and Trips to force both scroll directions at typical desktop sizes.
- Browser storage of changed positions when supported by the browser's file:// storage rules. The board still works in memory if browser storage is unavailable.
- **Reset sample data** to restore the initial positions (also clears Undo/Redo history).

## Deliberately deferred

- Working date/day filters.
- Editing Vehicle or Driver assignments.
- Temporarily pinning a Trip column after Unallocated.
- Auto-scrolling at the edge while dragging. The cursor must be over a visible valid drop zone.
- Job detail controls, real statuses and completion workflow.
- Live data, APIs and server-side persistence.
- Multiple Trips for the same Round/date.

**Prototype only:** The content is fictitious and changes are never written to the real WasteTracker system.

## Files

| File | Purpose |
| --- | --- |
| index.html | Page and board container |
| styles.css | Agreements-inspired design, sticky layout and drag/drop styling |
| data.js | Deterministic sample Trips and Jobs |
| app.js | Rendering, drag/drop, sequencing, browser storage and Undo/Redo |
