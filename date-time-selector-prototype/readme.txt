Date and Time Selector Prototype

A simple WasteTracker UI prototype for selecting a collection date and time as a deliberate two-step process.

Purpose

The current date/time picker makes the time selection feel slightly hidden beneath the calendar. This prototype separates the interaction into a normal page display and a hidden/displayable picker panel.

Page behaviour

- The page opens with the caption Collection date and time.
- The page shows one summary line: Selected date and time.
- The initial summary value is No date and time selected yet.
- The action button says Select collection date and time.
- Clicking the action button displays the picker panel.
- Once a date and time is set, the picker panel closes and the page summary updates.
- Once a date and time has been set, the action button changes to Change collection date and time.

Picker behaviour

Date step

- The picker opens on the Select date panel.
- The user can select Today or Tomorrow.
- The user can also pick a single date from the calendar.
- As soon as a date is selected, the prototype automatically switches to the time panel.

Time step

- The selected date is shown at the top.
- The time defaults to 12:00.
- Preset time buttons are provided for 09:00, 12:00, and 15:00.
- The hour can be incremented or decremented by 1.
- The hour is constrained from 00 to 23.
- The minutes increment or decrement in 15-minute steps.
- Decrementing minutes from 12:00 moves the time to 11:45.
- Incrementing minutes from 12:45 moves the time to 13:00.
- Manual typing is allowed.
- Hours must be between 00 and 23.
- Minutes must be between 00 and 59.
- Values are shown with leading zeroes.
- The Back button says Back to set date.

Files

- index.html - prototype structure
- styles.css - visual styling
- script.js - date/time behaviour
- readme.txt - prototype notes

Notes

This is intentionally a static prototype. It does not save to a backend. The Set date and time button updates the page summary and hides the picker panel.
