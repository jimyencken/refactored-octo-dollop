# Instructions for Downloading Splose CSS from the Live App

## Context
Another Claude Code session needs the compiled CSS from the real Splose app (running at `https://acme.splose.com/`) to build an interactive prototype that matches the real app's styling.

## Instructions to give the other session

---

### Downloading the Splose CSS

The Splose app at `acme.splose.com` is behind authentication, so you can't curl it directly. The user needs to extract the CSS from their browser. Here are the instructions to give them:

#### Option 1: Save all CSS via Chrome DevTools Console (Recommended)

1. Open `https://acme.splose.com/` in Chrome and log in
2. Open DevTools (Cmd+Option+I / Ctrl+Shift+I)
3. Go to the **Console** tab
4. Paste and run this script to download all CSS into a single file:

```javascript
(async () => {
  let css = '';
  // Grab all external stylesheets
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        css += rule.cssText + '\n';
      }
    } catch (e) {
      // Cross-origin sheet — fetch it instead
      if (sheet.href) {
        try {
          const res = await fetch(sheet.href);
          css += await res.text() + '\n';
        } catch (fetchErr) {
          console.warn('Could not fetch:', sheet.href);
        }
      }
    }
  }
  // Also grab any <style> tags
  document.querySelectorAll('style').forEach(s => { css += s.textContent + '\n'; });
  // Download
  const blob = new Blob([css], { type: 'text/css' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'splose-all.css';
  a.click();
})();
```

5. This downloads a file called `splose-all.css` containing all the app's styles

#### Option 2: Save individual CSS files from the Network tab

1. Open `https://acme.splose.com/` in Chrome and log in
2. Open DevTools → **Network** tab
3. Refresh the page
4. Filter by **CSS** (click the CSS button in the filter bar)
5. Right-click each CSS file → **Open in new tab** → **Ctrl+S** to save
6. Alternatively, right-click each → **Copy** → **Copy response** and paste into a `.css` file

#### Option 3: Use the Sources panel

1. Open DevTools → **Sources** tab
2. In the left panel, expand the domain tree for `acme.splose.com`
3. Look for `.css` files (often under a `static/css/` or `_next/static/css/` path, or hashed chunk filenames)
4. Right-click each CSS file → **Save as...**

### Once you have the CSS file(s)

Place the downloaded CSS file(s) in this repository and provide the path to the other Claude Code session. Tell it:

> "The file `splose-all.css` contains the compiled CSS from the live Splose app. Use these styles for the interactive prototype. Include it via `<link rel="stylesheet" href="splose-all.css">`."

---

## Notes
- Splose is an allied health practice management app (splose.com)
- The app likely uses hashed/chunked CSS filenames from a build tool (e.g., Next.js or similar)
- Option 1 is the most complete since it captures all CSS rules including dynamically loaded stylesheets
- The downloaded CSS will include all vendor/framework styles too (which is fine for prototype fidelity)
