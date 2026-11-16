# Day Board prototype — V00007

A standalone, local-file-friendly WasteTracker Day Board prototype.

## Run it

1. Pull the latest **main** branch using GitHub Desktop.
2. Open the **day-board-prototype** folder in your local checkout.
3. Double-click **index.html** to open it in Edge or Chrome.

There is **no localhost, build step, framework, CDN or web service**. Keep index.html, styles.css, data.js, map.js and app.js in the same folder.

## What is included

- 12 Trip columns, each showing the **parent Round name only**, with Vehicle and Driver displayed as read-only text.
- A **horizontally sticky Unallocated column** on the left.
- Trip headers that remain visible when scrolling vertically.
- An **always-visible sticky Unsequenced area** immediately below each Trip header, including a compact empty drop target when there are no unsequenced Jobs.
- A horizontal scrollbar at the **bottom of the board's fixed-height scrolling area**, always accessible while scrolling up/down through Jobs.
- One shared vertical scroll for every column.
- **Click a Job card** to select it. **Shift-click** selects the contiguous range between the previous anchor Job and the clicked Job, including across the Unsequenced/Sequenced divider. **Ctrl-click** adds/removes individual Jobs. Ctrl+Shift-click adds a range to the current selection. Every selected Job has a prominent, 4 px teal border.
- Only Jobs in the **same Trip column** (or all Unallocated) can be selected together. A modified click into another column silently does nothing. An ordinary click in another column replaces the selection.
- Click to select or **press and drag in one action**; a small movement threshold distinguishes the two. Dragging any Job that is already selected lifts **all selected Jobs**. The floating selection looks like a small stack of up to three fully opaque cards, with no count badge. A **single-card-sized gap** moves through the destination, and its existing cards smoothly move out of the way. On release, all the selected Jobs are inserted there as one contiguous block, in their original top-to-bottom order. All moved Jobs remain highlighted after drop.
- Clicking a selected card without dragging retains the full selection. Clicking empty board space or pressing **Escape** clears it. Selection itself does not create an Undo step.
- **Vertical auto-scroll while dragging:** hold a Job near the top of the visible column (just below the sticky header/Unsequenced section) to scroll earlier Sequenced Jobs into view, or near the bottom to reveal later Jobs. Scrolling continues while the pointer stays still, and stops on release/cancel. **No automatic horizontal scrolling** occurs during drags, including drags between columns.
- **Unsequenced safeguard:** while dragging a Sequenced Job, the sticky Unsequenced section is not a valid drop target until that Trip's **sequence position 01 is fully visible** below the sticky area. If position 01 is part of the dragged selection, the user must scroll all the way to the top. Jobs already in a Trip's Unsequenced section can still be reordered there.
- Dragging multiple Jobs is **one Undo operation**, including when moving across the Unsequenced/Sequenced divider or between Trips.
- A muted amber Unsequenced treatment; otherwise neutral cards.
- Round-specific sample work: skip Rounds show skips, bin Rounds show bins, RoRo shows RoRos, Muck Away shows loose loads, and so on. Unallocated remains mixed.
- Subtle sequence positions (**01**, **02**, etc.) which are distinct from the Job reference and recalculated after each move.
- Immediate application of each move, without Save/Discard.
- Multiple levels of **Undo/Redo** (up to 100 moves), with a brief confirmation toast.
- Shortcuts: **Ctrl+Z** (Undo), **Ctrl+Y** or **Ctrl+Shift+Z** (Redo).
- Invented sample data: **208 Jobs** across **12 Trips** and **15 initially Unallocated Jobs**. There are enough Jobs and Trips to force both scroll directions at typical desktop sizes.
- Browser storage of changed positions when supported by the browser's file:// storage rules. The board still works in memory if browser storage is unavailable.
- **Reset sample data** to restore the initial positions (also clears Undo/Redo history).

## Map mode (V00007)

- **Show map** slides a self-contained illustrated map in from the right of the Day Board, at one-third of the previous entrance speed (~1.14 seconds); **Hide map** retains its faster exit (~0.34 seconds) and restores the original full grid.
- The map appears alongside the **selected grid columns**, which retain their normal widths. Adding a grid column shrinks the available map space; removing one expands it. The vertical list of all Trips (plus Unallocated) is always present on the right.
- The default for each opening is **Unallocated + the first Trip** in both the grid and map. If there are no Unallocated Jobs, it instead starts with the **first two Trips**. After opening, users control the visibility themselves, even if the last Unallocated Job is moved.
- **Map** and **Grid** checkboxes are independent for every Trip and for Unallocated. An unlimited number of Trips can be shown on the map; **only four columns total (including Unallocated)** can be shown in the grid at once. Once four are ticked, unchecked Grid boxes disable until a slot is freed. Grid selections move their columns to the left beside the map; Map-only selections never add columns.
- A Trip's **Sequenced Jobs** appear as coloured numbered pins joined in order by **straight point-to-point lines**, not road routes. Its Unsequenced Jobs use hollow/dashed pins without connecting lines. Unallocated Jobs use muted-orange pins with no numbers or lines.
- Map marker positions are **fixed per sample Job**. They are fictional map coordinates (not real sites, postcode lookups or geocoded addresses), and stay fixed when the Job changes Trip.
- Grid edits (dragging, re-sequencing, Undo/Redo) refresh pins, numbers and connecting lines **without resetting zoom or pan**.
- Opening the map, changing Map visibility, or changing Grid visibility performs **Fit All**; users can also zoom in/out, mouse-wheel zoom, drag the map to pan, or press **Fit**.
- Clicking a marker in a **grid-visible** column selects the Job (thick teal border) and smoothly scrolls its card into view where necessary. Clicking a marker whose column is **not grid-visible** opens a small Job popup.
- The existing selected-Job controls and multi-Job dragging remain available in every grid-visible column.
- All map artwork, interaction and sample data work when opening `index.html` directly with `file://`, without online tiles or API keys. On narrower screens, selecting many full-width grid columns can require horizontal scrolling of the board frame.

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
| app.js | Rendering, drag/drop, sequencing, browser storage, Undo/Redo and map integration |
| map.js | Animated map mode, layer selectors, SVG map, markers, straight lines, zoom/pan and popup |
