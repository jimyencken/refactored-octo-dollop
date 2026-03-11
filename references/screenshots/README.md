# Splose Reference Screenshots

## Directory Structure

```
references/screenshots/
├── batch-01/           # First batch: Login, Client views
│   ├── manifest.json   # Metadata for each screenshot
│   └── *.png           # Actual screenshot files
├── batch-02/           # Second batch (TBD)
├── generated/          # Screenshots of our prototype for comparison
└── diffs/              # Visual diff output
```

## Naming Convention

Files are named: `{NN}-{page-name}.png`

- `01-login.png` - Login page
- `02-client-cases.png` - Client Cases table
- etc.

## Adding Screenshots

From your local machine, copy screenshots into the appropriate batch directory:

```bash
# Example: add batch-01 screenshots
cp ~/path/to/screenshot.png references/screenshots/batch-01/01-login.png
```

## Batch Manifest

Each batch directory contains a `manifest.json` describing every screenshot with:
- filename, page name, URL path
- description of what the screenshot shows
- key UI elements to match during prototyping
