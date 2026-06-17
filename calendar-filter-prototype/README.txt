Calendar Filter Prototype

A small proof-of-concept widget for demonstrating a WasteTracker-style calendar date filter picker.

What it demonstrates

- Initial caption: No filter set, all dates shown
- Button to open and hide the date filter panel
- Button label changes from Set date filter to Edit date filter once a filter is active
- Date filter panel with two tabs:
  - Presets
  - Custom
- Preset options:
  - Today
  - Tomorrow
  - This week
  - Next week
  - This month
- Custom options:
  - Single date
  - Date range
- Switching from Single date to Date range keeps the existing single date as the range start
- Calendar month navigation
- Immediate panel collapse after selecting a preset, a single date, or the end date of a date range
- Clear filter action
- Clear filter resets the next dialog opening to:
  - Presets tab
  - Single date custom mode
  - Current month calendar

Files

- index.html
- styles.css
- script.js

Notes

This is intentionally not a full app or complete page. It is a lightweight widget prototype using plain HTML, CSS, and JavaScript with no external libraries.
