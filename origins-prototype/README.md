# WasteTracker Origins prototype

Standalone prototype for Company → Dictionaries → Origins and Intake Load.

## Run

Open `index.html` in Edge or Chrome, or serve this directory with `python -m http.server 8000` and visit `http://localhost:8000`. No build, dependencies or backend required. Browser-local storage retains the shortlist and dummy intake origin where supported.

## Files

- `index.html` — markup and navigation
- `styles.css` — presentation
- `origins-data.js` — v2 reference hierarchy; labels and reporting values
- `app.js` — shortlist and intake selection logic

The dictionary changes are drafts until saved. All districts of selected WPAs are included automatically. The intake selector uses the saved shortlist and can be cleared. Existing intake selections are retained when removed from the shortlist.

The reference hierarchy is a provisional reconstruction of the reporting dictionary, not an authoritative Environment Agency lookup.
