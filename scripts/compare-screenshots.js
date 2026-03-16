const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");

const REFS_DIR = path.resolve(__dirname, "..", "references", "screenshots");
const GENERATED_DIR = path.join(REFS_DIR, "generated");
const DIFFS_DIR = path.join(REFS_DIR, "diffs");

/**
 * Discover all batch manifest files under references/screenshots/batch-*\/manifest.json
 */
function findManifests() {
  const entries = fs.readdirSync(REFS_DIR, { withFileTypes: true });
  const manifests = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith("batch-")) {
      const manifestPath = path.join(REFS_DIR, entry.name, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        manifests.push({ batchDir: entry.name, manifestPath });
      }
    }
  }
  return manifests.sort((a, b) => a.batchDir.localeCompare(b.batchDir));
}

/**
 * Read a PNG file and return a pngjs PNG object.
 * Returns null if the file does not exist or cannot be parsed.
 */
function readPng(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const buffer = fs.readFileSync(filePath);
    return PNG.sync.read(buffer);
  } catch (err) {
    console.error(`  Warning: could not parse PNG at ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Compare two PNG images using pixelmatch.
 * If dimensions differ, the smaller image is padded (transparent) to match the larger.
 * Returns { diffPng, mismatchedPixels, totalPixels, diffPercent }.
 */
function compareImages(refPng, genPng) {
  const width = Math.max(refPng.width, genPng.width);
  const height = Math.max(refPng.height, genPng.height);
  const totalPixels = width * height;

  // Pad images to the same dimensions if necessary
  const refData = padImage(refPng, width, height);
  const genData = padImage(genPng, width, height);

  const diff = new PNG({ width, height });

  const mismatchedPixels = pixelmatch(refData, genData, diff.data, width, height, {
    threshold: 0.1,
    alpha: 0.3,
    diffColor: [255, 0, 0],
    diffColorAlt: [0, 0, 255],
  });

  const diffPercent = totalPixels > 0
    ? parseFloat(((mismatchedPixels / totalPixels) * 100).toFixed(2))
    : 0;

  return { diffPng: diff, mismatchedPixels, totalPixels, diffPercent };
}

/**
 * Pad an image to the target width/height, filling extra space with transparent pixels.
 * Returns a raw RGBA Uint8Array of size width*height*4.
 */
function padImage(png, targetWidth, targetHeight) {
  if (png.width === targetWidth && png.height === targetHeight) {
    return png.data;
  }

  const padded = Buffer.alloc(targetWidth * targetHeight * 4, 0);

  for (let y = 0; y < png.height; y++) {
    const srcOffset = y * png.width * 4;
    const dstOffset = y * targetWidth * 4;
    png.data.copy(padded, dstOffset, srcOffset, srcOffset + png.width * 4);
  }

  return padded;
}

/**
 * Determine a status label based on the diff percentage.
 */
function statusFromDiff(diffPercent) {
  if (diffPercent === 0) return "perfect";
  if (diffPercent < 5) return "good";
  if (diffPercent < 10) return "acceptable";
  if (diffPercent < 25) return "needs_refinement";
  return "major_differences";
}

/**
 * Determine a priority label based on the diff percentage.
 */
function priorityFromDiff(diffPercent) {
  if (diffPercent < 5) return "low";
  if (diffPercent < 15) return "medium";
  return "high";
}

async function main() {
  console.log("Screenshot comparison tool");
  console.log("==========================\n");

  // Ensure output directories exist
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.mkdirSync(DIFFS_DIR, { recursive: true });

  const manifests = findManifests();
  if (manifests.length === 0) {
    console.log("No batch manifests found in", REFS_DIR);
    process.exit(0);
  }

  console.log(`Found ${manifests.length} batch manifest(s).\n`);

  const results = [];

  for (const { batchDir, manifestPath } of manifests) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch (err) {
      console.error(`Skipping ${batchDir}: could not parse manifest: ${err.message}`);
      continue;
    }

    const screenshots = manifest.screenshots || [];
    console.log(`--- ${batchDir} (${screenshots.length} screenshot(s)) ---`);

    for (const entry of screenshots) {
      const { filename, key_elements } = entry;
      const refPath = path.join(REFS_DIR, batchDir, filename);
      const genPath = path.join(GENERATED_DIR, filename);
      const diffFilename = filename.replace(/\.png$/, "-diff.png");
      const diffPath = path.join(DIFFS_DIR, diffFilename);

      const result = {
        reference: `${batchDir}/${filename}`,
        generated: `generated/${filename}`,
        reference_exists: fs.existsSync(refPath),
        generated_exists: fs.existsSync(genPath),
        pixel_diff_percent: null,
        mismatched_pixels: null,
        total_pixels: null,
        diff_image: null,
        status: "skipped",
        priority: "low",
        key_elements_to_review: key_elements || [],
        notes: [],
      };

      if (!result.reference_exists) {
        result.notes.push("Reference PNG not found");
        console.log(`  ${filename}: SKIP (reference not found)`);
        results.push(result);
        continue;
      }

      if (!result.generated_exists) {
        result.notes.push("Generated PNG not found - run capture-prototype.js first");
        result.status = "missing_generated";
        result.priority = "high";
        console.log(`  ${filename}: SKIP (generated not found)`);
        results.push(result);
        continue;
      }

      // Both files exist: compare
      const refPng = readPng(refPath);
      const genPng = readPng(genPath);

      if (!refPng || !genPng) {
        result.notes.push("Could not read one or both PNG files");
        console.log(`  ${filename}: ERROR (PNG read failure)`);
        results.push(result);
        continue;
      }

      const { diffPng, mismatchedPixels, totalPixels, diffPercent } = compareImages(refPng, genPng);

      // Write diff image
      try {
        fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
        result.diff_image = `diffs/${diffFilename}`;
      } catch (err) {
        result.notes.push(`Could not write diff image: ${err.message}`);
      }

      result.pixel_diff_percent = diffPercent;
      result.mismatched_pixels = mismatchedPixels;
      result.total_pixels = totalPixels;
      result.status = statusFromDiff(diffPercent);
      result.priority = priorityFromDiff(diffPercent);

      if (refPng.width !== genPng.width || refPng.height !== genPng.height) {
        result.notes.push(
          `Dimension mismatch: ref ${refPng.width}x${refPng.height} vs gen ${genPng.width}x${genPng.height}`
        );
      }

      console.log(`  ${filename}: ${diffPercent}% diff (${result.status})`);
      results.push(result);
    }

    console.log();
  }

  // Write the comparison report
  const report = {
    generated_at: new Date().toISOString(),
    refs_dir: REFS_DIR,
    total_screenshots: results.length,
    compared: results.filter((r) => r.pixel_diff_percent !== null).length,
    skipped: results.filter((r) => r.pixel_diff_percent === null).length,
    results,
  };

  const reportPath = path.join(DIFFS_DIR, "comparison-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${reportPath}`);

  // Summary
  const compared = results.filter((r) => r.pixel_diff_percent !== null);
  if (compared.length > 0) {
    const avgDiff =
      compared.reduce((sum, r) => sum + r.pixel_diff_percent, 0) / compared.length;
    console.log(`\nSummary: ${compared.length} compared, average diff ${avgDiff.toFixed(2)}%`);
  }

  const missing = results.filter((r) => r.status === "missing_generated");
  if (missing.length > 0) {
    console.log(`\n${missing.length} screenshot(s) missing generated version:`);
    for (const r of missing) {
      console.log(`  - ${r.reference}`);
    }
  }

  // Key elements reminder
  console.log("\nKey elements to manually review per screenshot:");
  for (const r of results) {
    if (r.key_elements_to_review.length > 0) {
      console.log(`  ${r.reference}:`);
      for (const el of r.key_elements_to_review) {
        console.log(`    - ${el}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
