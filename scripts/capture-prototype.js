const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const REFS_DIR = path.resolve(__dirname, "..", "references", "screenshots");
const GENERATED_DIR = path.join(REFS_DIR, "generated");
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome";

/**
 * Discover all batch manifest files and collect screenshot entries.
 */
function loadManifestEntries() {
  const entries = [];
  const dirItems = fs.readdirSync(REFS_DIR, { withFileTypes: true });

  for (const item of dirItems) {
    if (!item.isDirectory() || !item.name.startsWith("batch-")) {
      continue;
    }

    const manifestPath = path.join(REFS_DIR, item.name, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch (err) {
      console.error(`Skipping ${item.name}: could not parse manifest: ${err.message}`);
      continue;
    }

    const screenshots = manifest.screenshots || [];
    for (const screenshot of screenshots) {
      entries.push({
        batch: item.name,
        filename: screenshot.filename,
        url: screenshot.url,
        page: screenshot.page,
        description: screenshot.description,
      });
    }
  }

  return entries.sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Resolve a URL path from the manifest, replacing any placeholder tokens
 * like {id} with a default value so the page can actually load.
 */
function resolveUrl(urlPath) {
  // Replace common placeholder patterns with a default value
  // In practice you may want to configure these per-project
  return urlPath.replace(/\{[^}]+\}/g, "1");
}

async function main() {
  console.log("Prototype screenshot capture");
  console.log("============================\n");
  console.log("Base URL:", BASE_URL);
  console.log("Output:  ", GENERATED_DIR);
  console.log();

  // Ensure output directory exists
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const entries = loadManifestEntries();
  if (entries.length === 0) {
    console.log("No screenshot entries found in batch manifests.");
    process.exit(0);
  }

  console.log(`Found ${entries.length} screenshot(s) to capture.\n`);

  // Verify chromium is available
  if (!fs.existsSync(CHROMIUM_PATH)) {
    console.error(`Chromium not found at ${CHROMIUM_PATH}`);
    console.error("Set CHROMIUM_PATH environment variable to your chromium binary.");
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    console.error(`Could not launch browser: ${err.message}`);
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  let captured = 0;
  let failed = 0;

  for (const entry of entries) {
    const resolvedPath = resolveUrl(entry.url);
    const fullUrl = BASE_URL + resolvedPath;
    const outPath = path.join(GENERATED_DIR, entry.filename);

    const page = await context.newPage();
    try {
      console.log(`  [${entry.filename}] ${entry.page} -> ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: "networkidle", timeout: 30000 });
      // Let animations and lazy-loaded content settle
      await page.waitForTimeout(1500);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`    -> saved ${outPath}`);
      captured++;
    } catch (err) {
      console.error(`    -> FAILED: ${err.message}`);
      failed++;
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log(`\nDone. Captured: ${captured}, Failed: ${failed}, Total: ${entries.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
