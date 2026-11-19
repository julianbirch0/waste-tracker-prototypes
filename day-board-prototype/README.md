# Day Board prototype — V00027

A standalone, local-file-friendly WasteTracker Day Board prototype.

## Run it

1. Pull the latest **main** branch using GitHub Desktop.
2. Open the **day-board-prototype** folder in your local checkout.
3. Double-click **index.html** to open it in Edge or Chrome.

There is **no localhost, build step, framework, CDN or web service**. Keep index.html, styles.css, data.js, map.js, status.js and app.js in the same folder.

## What is included

- 12 Trip columns, each showing the **parent Round name only**, with **both Vehicle and Driver editable through separate ⇄ dialogs**.
- **Round groups** are represented by four invented operational groups: Skips Team, Trade & Bins, Recycling & Deliveries, and Specialist Fleet. These are mock assignments independent of the existing Round Definition prototype.
- The **Groups and Trips** multi-select above the Day Board defaults to everything selected. A **Select All** checkbox is followed by a subtle divider, a non-expandable **Unallocated** entry, four expandable ordinary groups with individual Trip checkboxes, and finally four **compact warning pseudo-filters**: **Trips with no driver assigned**, **Trips with duplicate driver**, **Trips with no vehicle assigned**, and **Trips with duplicate vehicle**. These four warning filters sit **at the bottom** of the dropdown, with **no expandable child Trip lists**; they primarily reflect the live filters activated by the amber warnings' **Show** buttons. They are disabled when they have no affected Trips; choosing either one activates exactly the same live issue filter as its warning's Show button. Clicking the active pseudo-group again restores the prior ordinary filter; choosing a normal group or Trip exits the special filter and starts a new manual selection. Ordinary group checkboxes select/deselect all their Trips, partial selections show mixed states, and Unallocated can be independently hidden. Chevrons expand/collapse without changing selections.
- **V00026–V00027: Job status and contextual Actions prototype.** Select one or more Jobs to show the floating Actions control. Cards use muted background colours and display the full status at the bottom (two lines where useful), with slightly more vertical breathing room.
- A **horizontally sticky Unallocated column** on the left, now using the **same muted amber background as Unsequenced Jobs** throughout its header and body.
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
- Muted amber Unsequenced areas; Job card backgrounds now reflect their status: neutral Planned, blue In progress, amber Needs attention, green Completed/Resolved, and grey Cancelled/Abandoned.
- Round-specific sample work: skip Rounds show skips, bin Rounds show bins, RoRo shows RoRos, Muck Away shows loose loads, and so on. Unallocated remains mixed.
- Subtle sequence positions (**01**, **02**, etc.) which are distinct from the Job reference and recalculated after each move.
- Immediate application of each move, without Save/Discard.
- Multiple levels of **Undo/Redo** (up to 100 moves), with a brief confirmation toast.
- Shortcuts: **Ctrl+Z** (Undo), **Ctrl+Y** or **Ctrl+Shift+Z** (Redo).
- Invented sample data: **208 Jobs** across **12 Trips** and **15 initially Unallocated Jobs per generated day**. There are enough Jobs and Trips to force both scroll directions at typical desktop sizes.
- V00008 replaces the random sample coordinates with a **sensible pre-planned serpentine visiting order for every Trip**. Unsequenced Jobs appear near likely insertion points in their Trip, and Unallocated Jobs are near appropriate Trips with matching service types. Coordinates are still fictional, not real postcode locations.
- The demonstration data retains the **V00008 browser storage key** to preserve previously saved Job, driver and vehicle changes. Starting with V00025, edits are stored against dated Trip/Job instances (storage format V4).
- Browser storage of changed positions when supported by the browser's file:// storage rules. The board still works in memory if browser storage is unavailable.
- **Reset sample data** to restore the initial positions (also clears Undo/Redo history).

## Date and Actions toolbar (V00027)

- The date navigator now occupies **two distinct widths**: a compact width for a **single date** and a wider width for a **date range**. Both use a gentle width transition on **Apply**, **Select Today**, or any date-mode change. The text remains centred; the previous over-wide gap between the date and the step buttons is removed.
- When **one or more Jobs are selected**, the same date box switches to a **softly darker Actions mode**. Its date/date-range remains visible as a smaller line at the top. The relative date caption and **Select Today**, **−**, **+**, and **Edit Date Filter** controls are temporarily hidden; they reappear as soon as the Job selection is cleared.
- **Actions** is a prominent expandable heading with the count of selected Jobs and a clear-selection control. Expanding it reveals the **existing context-sensitive status actions and disabled explanations**, and the same box **grows downwards over the content below it** with a transition. There is **no separate bottom-floating Actions control**.
- Date navigation, filtering, status rules, modal dialogs, local persistence, and Undo/Redo boundaries retain their V00026 behaviour.

## Job statuses and Actions (V00026)

- Statuses and replanned Jobs are **working prototype data**, not connected to WasteTracker, receiving facilities, or the DEFRA API. This version remains an **office Day Board**; driver-specific screens and role switching are not simulated.
- Click a Job, or Shift/Ctrl-click several Jobs in **one Trip**. The floating **Actions** menu shows context-sensitive actions. Ineligible actions remain visible but disabled with a short explanation. **Unallocated Jobs offer only Cancel as a status action.**
- **Service completion** supports Deliver, Collect, Exchange, Empty, Wait and Load, and illustrative organisation-defined **Other** services (*Refill soap dispenser* and *Inspect equipment*). Bulk service completion requires all selected Jobs to have the **same service** (the activity for standard services, the exact named service for Other). A single Job offers **optional** quantity, weight where appropriate, and an operational note; bulk completion has no per-Job actuals.
- **Facility progression** is On way to facility → At facility → Accepted/Rejected by facility. A rejection can go back to On way to facility. Different waste-moving services can share a bulk facility update, as long as every Job is eligible. Sample deliveries and non-waste Other services complete without visiting a facility.
- **Failures** distinguish customer and non-customer fault. Single-Job failure reporting offers a follow-up decision: leave outstanding, replan or abandon. Bulk failure reporting accepts one optional note applied to all selected Jobs.
- **Replanning** (single or bulk) creates a **new linked Planned Job** in Unallocated on **one chosen date**, which can be today. The original remains Failed – replanned on its previous Trip. Replanning stays on the current Day Board date, with an optional link to the new date. Later successful completion resolves ancestor failures; abandonment or cancellation of the replacement abandons them. Fault classifications remain intact.
- **Cancellation** requires Planned/unattempted Jobs, confirms the action and offers one optional reason (shared across a bulk selection). Cancelling a replanned replacement also abandons its earlier failed Jobs.
- A separate **Corrections** menu section supports simple reversals (service completion → Planned) and correction of an outstanding failure's fault classification. Operational updates, including corrections, record a lightweight status history and clear **planning Undo/Redo**. Complex corrections after On way to facility are deliberately deferred.
- **Moving between Trips or Unallocated is only permitted for Planned Jobs.** Any Job may be reordered **within its existing Trip**, regardless of status. Status changes never automatically remove or reshuffle cards.
- Job statuses, optional actuals, recorded notes, replanning links, and replacement Jobs persist in a **separate browser-local storage record**. Existing V00025 placement/assignment data is retained. **Reset sample data** also clears this status record.
- This deliberately does **not** implement the future full-page Job view, configurable Agreement-specific actuals, an organisation-wide Other-service dictionary editor, receiving-facility integrations or formal correction workflows.

## Summary toolbar layout (V00025)

- The Day Board toolbar displays **three ordered sections on the same line** at typical desktop widths: **Job/Trip/Unallocated/Unsequenced totals**, **Groups and Trips filter**, and finally **driver/vehicle warning pills** (single-day mode) or **Display order: Round then Date ⇄** (range mode).
- The totals and Groups and Trips sections each have **reserved horizontal widths**, with modest separators and padding. The totals region was tightened from 500px to **400px in V00025** to remove excessive empty space while preserving a stable dropdown position. The **Groups and Trips dropdown stays in the same horizontal position** when Job totals change, issue warnings appear/disappear, or the display order toggle is shown instead.
- In range mode, the first total now reads **N jobs displayed**, not "jobs in range". This counts only Jobs actually in the rendered columns, including Unallocated when visible, and honours the **40-column limit** and Group/Trip filtering. The other three totals retain their existing full-date-view counts. In single-day mode the established **jobs today / jobs on day** wording remains.

## Date selection and date ranges (V00025)

- **V00025 weekday caption:** Under a selected range, replace the day count with a plain-English reminder of **Days to display**: **All days shown**, **Showing Mon only**, **Showing Mon and Tue only**, or a longer comma-separated list such as **Showing Mon, Tue, Wed, Thu, Sat and Sun only**. All names appear in Monday–Sunday order regardless of selection order. Both single and range date captions share a fixed **340px** width to prevent horizontal movement when changing filters. The 40-column cap still selects the first eligible columns *after sorting* by the current Display order (so toggling the order may change which 40 Trips appear).


- **V00025:** After selecting exactly one date on the Custom calendar, the instruction is **“Click Apply to filter to a single date, or select a second date to select a date range.”** With nothing selected, the initial guidance remains; once two dates are selected, their actual date range is displayed as before.

- **V00025 fine-tuning:** Additional space separates the preset buttons from **Days to display**, while the custom calendar retains its compact layout. With nothing selected in Custom, the instruction reads **“Select a single date or select two dates to select a date range.”**

- **The currently selected date/range is the visual centrepiece at the top of the Day Board**, formatted **`dd-mmm`** for single dates (e.g. **18-Nov**) and **`dd-mmm – dd-mmm`** for ranges (e.g. **23-Nov – 28-Nov**). The main date stays **26 px**, with the relative description or selected-day count on a separate **12 px** line. Both single and range views use the **same fixed 275 px field**, keeping the whole date toolbar's width and both navigation buttons in precisely the same positions.
- For **single dates**, the date is followed by an intelligent relative description, calculated from browser-local Today using Monday–Sunday weeks: **Yesterday**, **Today**, **Tomorrow**, **This Thursday**, **Next Monday**, **Monday in 2 weeks**, **Monday 2 weeks ago**, **Monday last week**, or **Monday, this week** (for earlier days in the same week). The large caption makes it much harder to edit the wrong day's Jobs.
- **− / +** move one day backward or forward **only in single-date view**. In range view they **remain visible but disabled**; they are never removed from the layout. The main **Select Today** shortcut returns to Today, disabled when Today is already the active single date. The separate calendar-icon button remains removed.
- **Edit Date Filter** now visually matches the production **Reports** date filter: soft grey preset choices, **teal segmented Presets/Custom tabs**, generous spacing and a **fixed-size dialog** that does not resize when switching tabs. The six preset buttons are always **top-aligned** and never jump when weekday controls appear. The compact six-week custom calendar and weekday row fit inside the desktop dialog **without a scrollbar**; very short viewports may still scroll for accessibility. The dialog **clips its contents to rounded corners**, including the footer. There is **no redundant current-date preview**. Apply and Cancel stay in their original footer positions. The reserved 40-column notice is **neutral white when empty**, turning subtle amber only when the message appears.
- **Opening state:** Presets is shown by default, with **no preset highlighted**, even when a preset is already active on the board. If and only if the current filter is an **existing custom date range**, the dialog opens on **Custom** with the selected range intact and the calendar displaying the **month containing its start date**. A prior custom single-date filter still opens on Presets, with its date retained if the user switches to Custom.
- **Presets** retains **Today, Tomorrow, This Week, Next Week, This Month, Next Month**. **Today and Tomorrow apply immediately and dismiss the dialog** without an extra Apply click. Week/month presets show **Monday–Sunday checkboxes**, initially all selected. A small underlined **Deselect all** text control is shown when all seven are ticked; otherwise it reads **Select all**. No weekdays selected, or a filter identical to the current one, disables **Apply**. Selecting another week/month preset starts with all weekdays selected.
- **Custom** presents one **Monday-first calendar**, without Single Date/Date Range buttons. One click selects **one date**, which can be applied immediately; a second click selects a range, automatically sorting the endpoints chronologically regardless of click order. **Today is outlined but not selected** for a fresh custom selection.
- **Editable range endpoints:** The dialog remembers which range endpoint was last clicked/adjusted. A click **inside** the range moves that last-adjusted endpoint, allowing it to shrink in the direction the user originally chose (e.g. 21→17→18 means 18–21 Nov; 17→21→19 means 17–19 Nov). A click **outside** extends the appropriate boundary (17→21→25 gives 17–25 Nov; 17→21→14 gives 14–21 Nov). Clicking either selected boundary deselects just that boundary and leaves the other date selected as a **single date**. Clicking the remaining selected date clears the selection entirely. There is no need for a Reset button.
- **Days to display** checkboxes appear **only when two custom dates form a range**, or when a week/month preset is chosen. The outer option remains a gently tinted mint when checked, while **the checkbox itself is white in both checked and unchecked states** (with a teal tick when checked). Weekday changes are provisional until Apply; ranges with no selected days **silently disable Apply** rather than showing an unnecessary validation message. Ranges exceeding the prototype's 31-day limit and unchanged filters also keep Apply disabled. **Cancel**, Escape, and clicking the backdrop discard unsaved changes.
- **Display order: Round then Date ⇄** now sits on the **main page beside Groups and Trips**, rather than in the date toolbar, shown **only for any range view** (preset or custom). It swaps to **Date then Round**, applying immediately to the existing grid without reopening the date modal. The control is absent for single dates.
- Date-range views repeat the relevant Round as a separate dated Trip for each included day, with **`ddd, dd-mmm`** shown prominently in its column heading. The map's Trip labels and driver/vehicle dialogs also distinguish each date. Assignment dialogs operate on the Trip's own day, while cross-date Job moves remain possible.
- **A maximum of 40 columns** is rendered in the full grid, in the current display order, **including Unallocated when selected**. The limit is evaluated after the date range, weekday and Groups and Trips selections are applied. If more than 40 columns qualify, a **reserved message row inside the Edit Date Filter dialog**, immediately above its Apply/Cancel footer, displays the exact message: **"Only the first 40 columns will be displayed in the grid."** This warning is calculated against the **draft date/weekday filter and existing Group/Trip selections** before Apply; its reserved height avoids dialog layout shifts. Nothing appears underneath the main date toolbar. All dated Jobs and Trips remain stored, even when their columns are beyond the visible 40.
- Driver and vehicle allocation warnings, and their associated special filter entries, are hidden in date-range view to avoid confusion across repeated dates; they return for a single selected day.
- The Groups and Trips selection follows parent Round names when navigating dates. Date changes clear the current view's Undo/Redo history, preventing actions on the wrong day. Dated Job positions, cross-date moves and driver/vehicle assignments remain saved under the existing browser key using V4 storage.
- The prototype currently accepts custom ranges of up to **31 calendar days** to constrain the amount of generated sample data. **Reset sample data** restores original Jobs and allocations across all dates. Older V1–V3 saved edits are migrated to the original **Monday 16-Nov-2026** sample day, not silently assigned to Today.

## Driver assignment and swapping (V00025)

- A small **⇄** button beside the driver in each Trip heading opens **Change driver**. This works in both the full Day Board and the map's visible grid columns.
- The dialog displays **Trip (Round)**, the **actual selected Trip date** (e.g. **Tuesday, 17-Nov**), and the current **Assigned driver** (or **Unassigned**) with an **Unassign** button when a driver exists.
- The first list contains **Unassigned drivers**, sorted alphabetically, with only **Assign** buttons. These are genuinely free drivers with no Trip allocations in the proposed working copy.
- The second list contains **Assigned drivers**, sorted by driver name and then Trip name, showing **one row for every driver–Trip allocation**. A driver allocated to two Trips appears twice. The Trip being edited is represented at the top rather than listed again.
- **Assign** makes that driver responsible for the current Trip but deliberately leaves their other Trip allocations untouched. The old driver is no longer assigned to the edited Trip and appears as Unassigned if they have no other allocation.
- **Swap** exchanges the current Trip driver with the driver on **that specific allocated Trip row**, preserving any other Trips belonging to either driver. Swap is shown only when the edited Trip already has a driver. An unassigned driver's row has **Assign** only.
- The dialog operates on a **provisional working copy**: Unassign, Assign and Swap immediately refresh its two lists, but **Cancel** or Escape discards all changes. **Save and Close always refreshes** the Day Board, driver names, and warnings, and persists changes locally. Clicking outside the dialog also cancels.
- Every Save and Close that actually changes allocations creates **one Undo/Redo history step**, even if several drivers were changed within the dialog. Job moves share the same history and are unaffected. An unchanged Save still refreshes but adds no redundant Undo step.
- **Driver warning pills** appear **in the same toolbar row immediately after the Job/Trip/Unallocated/Unsequenced totals** when applicable: **N trips with no driver assigned** and **N drivers assigned to multiple trips**. Each includes a small **Show** button. Clicking Show activates the corresponding **live issue filter** in Groups and Trips, closing the map first if needed. The grid shows all Trips currently affected by that issue (never Unallocated) and immediately removes resolved Trips after Save and Close. When the **last** issue in the active category is resolved, the exact prior manual selection of Trips and Unallocated is restored. Warning counts always include every Trip regardless of filter.
- **Special filter order:** the unassigned-driver issue filter shows Trip columns alphabetically by **Trip name**. The duplicate-driver issue filter sorts by **driver name**, then **Trip name**. In ordinary filter mode, the pre-existing Trip order is preserved. The issue lists update on **Save and Close, Undo, Redo and Reset** without a page reload. Switching between warning categories retains the original selection for eventual restoration.
- The sample starts with **two unassigned Trips** (Recycling 1 and Bin Deliveries), **one driver on two Trips** (Lisa Walker on Skips 2 and Skips 4), and **five unassigned drivers**. The new driver assignments are saved alongside existing Job placements in the same browser storage key, with backwards compatibility for older saved placements.
- **Reset sample data** restores the pre-planned Job placements, original driver allocations and original vehicle allocations, and clears Undo/Redo.

## Vehicle assignment and swapping (V00025)

- Each Trip's **Vehicle** line has its own small **⇄** button beside the registration, matching the Driver edit button.
- The **Change vehicle** dialog shows the parent Round/Trip name, **its actual date**, the current vehicle registration (or **Unassigned**) and an **Unassign** button when a vehicle exists.
- **Unassigned vehicles**, sorted by registration, have only **Assign** buttons. **Assigned vehicles**, sorted by registration then Trip name, appear once per allocation with **Assign** and **Swap** buttons (Swap only when the edited Trip already has a vehicle).
- **Assign** replaces the edited Trip's vehicle without changing the selected vehicle's other Trip allocations. **Swap** exchanges the vehicle on the edited Trip with the registration on the specific other allocated Trip row. Both vehicles' remaining allocations are untouched.
- Edits update the modal's provisional lists immediately; **Cancel/Escape** discards them. **Save and Close** applies all changes, refreshes the Day Board and warnings, writes them to browser storage, and records the whole edit as **one Undo step**. Existing driver assignments and Job placements are unaffected.
- Two new **amber warnings** appear alongside the driver warnings in the summary toolbar: **N trips with no vehicle assigned** and **N vehicles assigned to multiple trips**. Both have **Show** buttons and matching pseudo-groups in the Groups and Trips dropdown.
- Vehicle filters are **live**: resolving an issue immediately removes affected Trip columns. Once the last relevant issue is resolved, the prior normal filter (including Unallocated visibility) is restored. Switching amongst any of the four warning types preserves that original selection.
- **No vehicle assigned** sorts Trip columns by Trip name. **Duplicate vehicle** sorts by vehicle registration then Trip name. Warning totals are calculated over all Trips, not just visible ones.
- Demonstration data begins with **two vehicle-unassigned Trips** (Recycling 1 and Wait and Load), **one vehicle on two Trips** (BX73 FHT on Skips 2 and Skips 4), and **five unassigned vehicle registrations** available to assign.
- Persistence remains on the existing Day Board browser-storage key. **Version 4** stores dated Jobs, driver and vehicle assignments, with backwards-compatible loading of V1–V3. Their existing edits are correctly migrated to the **original Monday 16-Nov-2026 sample day**, not accidentally attributed to Today.

## Map mode (V00025)

- **Show map** slides a self-contained illustrated map in from the right of the Day Board, at one-third of the previous entrance speed (~1.14 seconds); **Hide map** retains its faster exit (~0.34 seconds) and restores the original full grid.
- The map appears alongside the **selected grid columns**, which retain their normal widths. Adding a grid column shrinks the available map space; removing one expands it. The vertical list of all Trips (plus Unallocated) is always present on the right.
- The map's right-hand list is organised into **expandable/collapsible group sections**, with Unallocated separate at the top. Every Trip retains independent Map and Grid checkboxes, and collapsing a group hides only its list entries, **not** its map markers or grid columns.
- **Expanded map groups and the main Group/Trip filter are synchronised.** Expanding a map group selects all its Trips in the full grid; collapsing it deselects them. On closing the map, the full-width Day Board shows **exactly the selected Trips**, including any individual Trip exclusions made in the dropdown. Opening the map defaults to the first selected Trip(s), while Map/Grid checkbox selections remain independent.
- The default for each opening is **Unallocated + the first selected Trip in the current display order** in both the grid and map, provided Unallocated is selected and contains Jobs. If Unallocated is empty or deselected, it instead starts with the **first two selected Trips**. After opening, users control the visibility themselves, even if the last Unallocated Job is moved.
- **Map** and **Grid** checkboxes are independent for every Trip and for Unallocated. An unlimited number of Trips can be shown on the map; **only four columns total (including Unallocated)** can be shown in the grid at once. Once four are ticked, unchecked Grid boxes disable until a slot is freed. Grid selections move their columns to the left beside the map; Map-only selections never add columns.
- In date-range mode, the map layer list includes the **date** beside each repeated Round name, so different dated Trips can be distinguished. A Trip's **Sequenced Jobs** appear as coloured numbered pins joined in order by **straight point-to-point lines**, not road routes. Its Unsequenced Jobs use hollow/dashed pins without connecting lines. Unallocated Jobs use muted-orange pins with no numbers or lines.
- Map marker positions are **fixed per sample Job**. They are fictional map coordinates (not real sites, postcode lookups or geocoded addresses), and stay fixed when the Job changes Trip.
- Grid edits (dragging, re-sequencing, Undo/Redo) refresh pins, numbers and connecting lines **without resetting zoom or pan**.
- Opening the map, changing Map visibility, or changing Grid visibility performs **Fit All**; users can also zoom in/out, mouse-wheel zoom, drag the map to pan, or press **Fit**.
- Clicking a marker in a **grid-visible** column selects the Job (thick teal border) and smoothly scrolls its card into view where necessary. Clicking a marker whose column is **not grid-visible** opens a small Job popup.
- The existing selected-Job controls and multi-Job dragging remain available in every grid-visible column.
- All map artwork, interaction and sample data work when opening `index.html` directly with `file://`, without online tiles or API keys. On narrower screens, selecting many full-width grid columns can require horizontal scrolling of the board frame.

## Deliberately deferred

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
