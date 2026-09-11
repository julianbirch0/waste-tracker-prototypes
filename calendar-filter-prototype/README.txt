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
  - This Week
  - Last Week
  - This Month
  - Last Month
  - This Quarter
  - Last Quarter
- Custom options shown in the same segmented-control style as the Presets / Custom tabs:
  - Single date
  - Date range
- Editing a date range displays the month containing its start date
- Switching between Single date and Date range clears the current date selection and returns the calendar to the current month
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
- script-v2.js

Notes

This is intentionally not a full app or complete page. It is a lightweight widget prototype using plain HTML, CSS, and JavaScript with no external libraries.
