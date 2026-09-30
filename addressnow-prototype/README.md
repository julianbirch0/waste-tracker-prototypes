# AddressNow prototype

A static HTML/CSS/JavaScript lookup lab using Royal Mail's AddressNow v2.30 browser control with explicit field bindings. No build tools or backend required.

## Run locally

1. Pull the latest changes in GitHub Desktop.
2. Copy `addressnow-config.example.js` to **`addressnow-config.local.js`** in this folder.
3. Replace the placeholder with your separate prototype key. Do not commit the local file.
4. Double-click **`index.html`** to open it directly in your browser. No localhost server or build step is required.

The prototype uses ordinary script tags and Royal Mail’s browser control, rather than fetching local configuration files. Live lookup from a `file://` page still depends on Royal Mail accepting your key’s URL/security settings; a key restricted to a website domain may reject a local-file page. If live lookup fails, check those settings using a separate prototype key with a modest usage limit. Sample mode works independently of Royal Mail.

Without a key the app runs in clearly labelled sample mode. Sample addresses are fictional and are not validation results. A missing local configuration file can produce an expected browser-console missing-file message; the app still works in sample mode.

## Explore

- Dedicated search box, separate editable Company, Line1–4, City, Province, PostalCode and CountryName fields.
- Original selected response alongside current mapped values. Original response does not change when editing.
- Single comma-separated string and postal-style block derived from current fields. County is retained separately but omitted from both formatted previews.
- Suggestion limit (1–50, default 7), result limit (1–300, default 100), and provider-bar visibility. Apply recreates the live control; it preserves address fields.
- Manual entry, no-match/error messages and change-address action with confirmation before discarding entered details.
- All data is held in memory; nothing is saved or submitted. Live searches send query text to Royal Mail's service and may consume account allowance. Sample mode sends no queries.

The provider library loads only when a non-placeholder key exists. Key configuration remains browser-visible; use account URL/usage restrictions. No key from screenshots has been used.

## Validation and limitations

Sample mode and form interactions can be tested without credentials. Live authentication, allowed URLs, account-specific field values, provider dropdown behaviour and actual result limits need checking with your key. This prototype maps returned values explicitly; it does not rely on account-side automatic form detection. Royal Mail's library supplies search, drill-down and selection behaviour.

References: https://addressnow.royalmail.com/support/guides/getting-started/ and https://addressnow.royalmail.com/support/guides/advanced-guide/
