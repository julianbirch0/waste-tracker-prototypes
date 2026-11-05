# WasteTracker – Round Planning prototype

## Run it

1. Pull the `main` branch of [julianbirch0/waste-tracker-prototypes](https://github.com/julianbirch0/waste-tracker-prototypes) in GitHub Desktop.
2. Open `round-planning-prototype/index.html` in your browser.

There is no build step, web server, framework, external library or internet dependency. Keep `index.html`, `styles.css`, `data.js` and `app.js` together.

## Behaviour

- **Select Round** changes the round whose agreement sequence is displayed.
- Only agreements with that round's ID in their `roundIds` appear. **You cannot add/remove agreement associations on this screen.** That belongs to the future Agreements screen.
- **Sequence** is generated from row order (1, 2, 3 …); it isn't directly editable.
- **Reorder** by dragging the left-hand handle. Keyboard alternative: focus a handle and press **Up** or **Down**.
- **View Agreement** shows a small modal with agreement number, customer, site and location. It intentionally doesn't navigate to the unbuilt Agreements page.
- **Save** saves the selected round's sequence in the browser's `localStorage`.
- **Cancel** discards this round's unsaved sequence (with confirmation).
- **Unsaved changes:** changing rounds or selecting View Agreement prompts **Keep Editing**, **Discard & Continue** or **Save & Continue**. Closing/reloading a dirty browser page invokes the browser's normal unsaved-changes confirmation.
- **Reset sample sequences** discards *all* browser-stored sequences and restores the order supplied in `data.js`.

## Data model

The self-contained `data.js` lists:

- `rounds`: ID, name, scheduled days.
- `agreements`: ID, agreement number, customer/site details, timing, material, container, quantity, and a list of associated `roundIds`.

Associations are read-only in this prototype. The only persisted data is a mapping of `roundId` to an ordered list of agreement IDs. When the associations in `data.js` change, any newly assigned agreement appears at the end and any no-longer-assigned agreement disappears. That leaves agreement ownership in one place.

Note: Round Planning uses **its own sample data** and browser storage, rather than directly reading/writing Round Definitions' saved browser records. The prototypes can therefore run independently until we explicitly decide how to connect them.

## Browser storage

Changes normally persist when reopened from the same file location in the same browser. Some browsers restrict `localStorage` under `file://`; the screen remains usable but warns that the save is for the current page only.

Saving does **not** modify `data.js` or any GitHub file. Edit `data.js` to change the starter data.

## Intentionally deferred

- Agreement add/edit screen and actual navigation.
- Editing agreement-to-round associations.
- Trip/Job generation, operational scheduling, and backend/API integration.
