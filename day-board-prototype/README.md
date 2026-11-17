# Day Board prototype — V00012

A standalone, local-file-friendly WasteTracker Day Board prototype.

## Run it

1. Pull the latest **main** branch using GitHub Desktop.
2. Open the **day-board-prototype** folder in your local checkout.
3. Double-click **index.html** to open it in Edge or Chrome.

There is **no localhost, build step, framework, CDN or web service**. Keep index.html, styles.css, data.js, map.js and app.js in the same folder.

## What is included

- 12 Trip columns, each showing the **parent Round name only**, with Vehicle displayed as read-only text and Driver changed through the ⇄ dialog.
- **Round groups** are represented by four invented operational groups: Skips Team, Trade & Bins, Recycling & Deliveries, and Specialist Fleet. These are mock assignments independent of the existing Round Definition prototype.
- The **Groups and Trips** multi-select above the Day Board defaults to everything selected. A **Select All** checkbox is followed by a subtle divider, a non-expandable **Unallocated** entry, two **live pseudo-groups** for **Trips with no driver assigned** and **Trips with duplicate driver**, and four expandable ordinary groups with individual Trip checkboxes. The pseudo-groups have expandable, read-only child Trip lists and their own mutually exclusive checkboxes. They are disabled when they have no affected Trips; choosing either one activates exactly the same live issue filter as its warning's Show button. Clicking the active pseudo-group again restores the prior ordinary filter; choosing a normal group or Trip exits the special filter and starts a new manual selection. Ordinary group checkboxes select/deselect all their Trips, partial selections show mixed states, and Unallocated can be independently hidden. Chevrons expand/collapse without changing selections.
- Every Job card now has a subtle light-blue **planned** status pill; this is a placeholder for future Job status workflows.
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
- V00008 replaces the random sample coordinates with a **sensible pre-planned serpentine visiting order for every Trip**. Unsequenced Jobs appear near likely insertion points in their Trip, and Unallocated Jobs are near appropriate Trips with matching service types. Coordinates are still fictional, not real postcode locations.
- The demonstration data uses the **V00008 browser storage key**, ensuring these re-planned sample sequences appear as the starting position after the update. Older V00007 edits are not imported.
- Browser storage of changed positions when supported by the browser's file:// storage rules. The board still works in memory if browser storage is unavailable.
- **Reset sample data** to restore the initial positions (also clears Undo/Redo history).

## Driver assignment and swapping (V00012)

- A small **⇄** button beside the driver in each Trip heading opens **Change driver**. This works in both the full Day Board and the map's visible grid columns.
- The dialog displays **Trip (Round)**, the fixed sample date **Monday, 16-Nov** (`dddd, dd-mmm`), and the current **Assigned driver** (or **Unassigned**) with an **Unassign** button when a driver exists.
- The first list contains **Unassigned drivers**, sorted alphabetically, with only **Assign** buttons. These are genuinely free drivers with no Trip allocations in the proposed working copy.
- The second list contains **Assigned drivers**, sorted by driver name and then Trip name, showing **one row for every driver–Trip allocation**. A driver allocated to two Trips appears twice. The Trip being edited is represented at the top rather than listed again.
- **Assign** makes that driver responsible for the current Trip but deliberately leaves their other Trip allocations untouched. The old driver is no longer assigned to the edited Trip and appears as Unassigned if they have no other allocation.
- **Swap** exchanges the current Trip driver with the driver on **that specific allocated Trip row**, preserving any other Trips belonging to either driver. Swap is shown only when the edited Trip already has a driver. An unassigned driver's row has **Assign** only.
- The dialog operates on a **provisional working copy**: Unassign, Assign and Swap immediately refresh its two lists, but **Cancel** or Escape discards all changes. **Save and Close always refreshes** the Day Board, driver names, and warnings, and persists changes locally. Clicking outside the dialog also cancels.
- Every Save and Close that actually changes allocations creates **one Undo/Redo history step**, even if several drivers were changed within the dialog. Job moves share the same history and are unaffected. An unchanged Save still refreshes but adds no redundant Undo step.
- Two subtle **amber warning pills** appear **in the same toolbar row immediately after the Job/Trip/Unallocated/Unsequenced totals** when applicable: **N trips with no driver assigned** and **N drivers assigned to multiple trips**. Each includes a small **Show** button. Clicking Show activates the corresponding **live issue filter** in Groups and Trips, closing the map first if needed. The grid shows all Trips currently affected by that issue (never Unallocated) and immediately removes resolved Trips after Save and Close. When the **last** issue in the active category is resolved, the exact prior manual selection of Trips and Unallocated is restored. Warning counts always include every Trip regardless of filter.
- **Special filter order:** the unassigned-driver issue filter shows Trip columns alphabetically by **Trip name**. The duplicate-driver issue filter sorts by **driver name**, then **Trip name**. In ordinary filter mode, the pre-existing Trip order is preserved. The issue lists update on **Save and Close, Undo, Redo and Reset** without a page reload. Switching between warning categories retains the original selection for eventual restoration.
- The sample starts with **two unassigned Trips** (Recycling 1 and Bin Deliveries), **one driver on two Trips** (Lisa Walker on Skips 2 and Skips 4), and **five unassigned drivers**. The new driver assignments are saved alongside existing Job placements in the same browser storage key, with backwards compatibility for older saved placements.
- **Reset sample data** restores both the pre-planned Job placements and the original driver assignments, and clears Undo/Redo.

## Map mode (V00012)

- **Show map** slides a self-contained illustrated map in from the right of the Day Board, at one-third of the previous entrance speed (~1.14 seconds); **Hide map** retains its faster exit (~0.34 seconds) and restores the original full grid.
- The map appears alongside the **selected grid columns**, which retain their normal widths. Adding a grid column shrinks the available map space; removing one expands it. The vertical list of all Trips (plus Unallocated) is always present on the right.
- The map's right-hand list is organised into **expandable/collapsible group sections**, with Unallocated separate at the top. Every Trip retains independent Map and Grid checkboxes, and collapsing a group hides only its list entries, **not** its map markers or grid columns.
- **Expanded map groups and the main Group/Trip filter are synchronised.** Expanding a map group selects all its Trips in the full grid; collapsing it deselects them. On closing the map, the full-width Day Board shows **exactly the selected Trips**, including any individual Trip exclusions made in the dropdown. Opening the map defaults to the first selected Trip(s), while Map/Grid checkbox selections remain independent.
- The default for each opening is **Unallocated + the first selected Trip** in both the grid and map, provided Unallocated is selected and contains Jobs. If Unallocated is empty or deselected, it instead starts with the **first two selected Trips**. After opening, users control the visibility themselves, even if the last Unallocated Job is moved.
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
- Editing Vehicle assignments (driver assignment is now implemented).
- Temporarily pinning a Trip column after Unallocated.
- Real status changes, status-dependent styling and completion workflow.
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
