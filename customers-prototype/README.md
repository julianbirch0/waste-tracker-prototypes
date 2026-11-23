# Customers prototype

Saved map selections are kept in the current browser. To share them with everyone using the prototype, choose **Export coordinates** on the Customers list, replace this folder's `site-coordinates.json` with the downloaded file, and commit it to GitHub.

The prototype loads that file automatically when served over HTTP or HTTPS. If you open `index.html` directly from disk, choose **Import coordinates** and select the JSON file. Existing browser-saved selections take precedence, so importing or loading the shared file preserves local edits. Export includes both sets of coordinates.
