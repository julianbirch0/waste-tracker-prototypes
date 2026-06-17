# Date and Time Selector Prototype

A simple WasteTracker UI prototype for selecting a collection date and time as a deliberate two-step process.

## Purpose

The current date/time picker makes the time selection feel slightly hidden beneath the calendar. This prototype separates the interaction into two clear stages:

1. Select date
2. Select time

## Behaviour

### Date step

- The selector opens on the **Select date** panel.
- The user can select **Today** or **Tomorrow**.
- The user can also pick a single date from the calendar.
- As soon as a date is selected, the prototype automatically switches to the time panel.

### Time step

- The selected date is shown at the top.
- The time defaults to **12:00**.
- Preset time buttons are provided for **09:00**, **12:00**, and **15:00**.
- The hour can be incremented or decremented by 1.
- The hour is constrained from **00** to **23**.
- The minutes increment or decrement in 15-minute steps.
- Decrementing minutes from `12:00` moves the time to `11:45`.
- Incrementing minutes from `12:45` moves the time to `13:00`.
- Manual typing is allowed.
- Hours must be between `00` and `23`.
- Minutes must be between `00` and `59`.
- Values are shown with leading zeroes.

## Files

- `index.html` - prototype structure
- `styles.css` - visual styling
- `script.js` - date/time behaviour

## Notes

This is intentionally a static prototype. It does not save to a backend. The **Set date and time** button currently shows an alert with the selected value.
