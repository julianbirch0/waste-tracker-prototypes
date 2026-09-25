# Image Upload Prototype

Proof of concept for adding job photos to WasteTracker without requiring the image to be saved to a local folder first.

## Supported input routes

- **Select** — conventional file picker.
- **Paste** — paste an image from the clipboard with `Ctrl+V`; the Paste button also uses the browser Clipboard API where available.
- **Drag and drop** — drop image files anywhere on the page/control.

## Prototype image pipeline

1. Validate that the incoming item is an image.
2. Resize so the longest edge is no more than **1600 px**.
3. Re-encode as **JPEG at 82% quality**.
4. Strip source image metadata by drawing to a canvas and encoding a fresh image.
5. Save the processed image plus simulated record metadata to **IndexedDB**.
6. Show it as a thumbnail.
7. Keep a fresh Add Photo control available alongside the saved thumbnails.

The original image is **not retained**.

Saved prototype records include the source method, original/stored filename, dimensions, original/stored file size, timestamp and the processed image blob.

## Running it

For the most complete clipboard behaviour, serve the folder from `localhost` rather than opening the HTML directly from `file://`.

For example, from this folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Normal `Ctrl+V` paste handling, file selection, drag/drop, compression, IndexedDB persistence, delete and expanded image viewing are all implemented client-side. The prototype has no backend and sends no images anywhere.
