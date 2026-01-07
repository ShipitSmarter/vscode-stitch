# PDF.js

Library from Mozilla used to preview PDF files.<br>
Used version: `2.9.359`.

## Optimizations

To reduce extension size, the following files have been removed:

- **Locale files**: Removed 107 locale directories, keeping only `en-US`
- **Source maps**: Removed all `*.map` files (not needed in production)
- **Example HTML**: Removed `web/viewer.html` (extension generates its own)

**Result**: Reduced from 339 files (15 MB) to 228 files (6.8 MB)

## Changes made for this extension.

Some changes were needed to get the library to work the way we want.

### Remove default url

In `web/viewer.js` change the `defaultUrl` in the `defaultOptions`:

```js
const defaultOptions = {
  ...
  defaultUrl: {
    value: "", //"compressed.tracemonkey-pldi-09.pdf",
    kind: OptionKind.VIEWER
  },
  ...
}
```

### Comment out data: URI check

We couldn't get the viewer to properly work when sending an ArrayBuffer or binary string, so we resorted to opening the PDF via a data: URI.
PDF.js has a check built in to ignore data: URI's, so we need to comment that out.

In `build/pdf.js`:

```js
function getPdfFilenameFromUrl(url, defaultFilename = "document.pdf") {
  if (typeof url !== "string") {
    return defaultFilename;
  }

  // if (isDataScheme(url)) {
  //   (0, _util.warn)('getPdfFilenameFromUrl: ignore "data:"-URL for performance reasons.');
  //   return defaultFilename;
  // }

  ...
}
```

(Data URI is default ignored for security reasons, but we don't expect large PDFs, so it should not be a problem for our purposes)

### Change the HTML

In a VS Code webview, all resources must be referenced via a webview URI. Therefore, the `web/viewer.html` has been copied into our `PdfPreview` class.
All relative URI's are replaced with `resolveAsUri('path', 'to', 'file')`.

We also added `pdf.css`, `pdf-main.js` and a Content Security Policy in the `head` tag.

## Updating PDF.js

- Download the prebuilt release (zip).
- Extract zip here (replacing existing files).
- Apply changes mentioned above again.
- Remove demo PDF file.
- Clean up unnecessary files:
  - Remove all locale directories except `en-US`
  - Remove all `*.map` files
  - Remove `web/viewer.html`
- Update `Used version` at top of this document.