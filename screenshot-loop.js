const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const DIR = __dirname + "/screenshots";
const INTERVAL = 10000; // 10 seconds

// All pages/states to capture for UX review
const pages = [
  { name: "chat", path: "/", setup: null },
  { name: "contacts", path: "/", setup: async (page) => {
    await page.click('.nav-item:has-text("Contacts")');
    await page.waitForTimeout(500);
  }},
  { name: "reminders", path: "/", setup: async (page) => {
    await page.click('.nav-item:has-text("Reminders")');
    await page.waitForTimeout(500);
  }},
  { name: "messages", path: "/", setup: async (page) => {
    await page.click('.nav-item:has-text("Messages")');
    await page.waitForTimeout(500);
  }},
  { name: "notifications", path: "/", setup: async (page) => {
    await page.click('.nav-item:has-text("Alerts")');
    await page.waitForTimeout(500);
  }},
  { name: "quickchat-fab", path: "/", setup: async (page) => {
    // Navigate away from chat so FAB is visible
    await page.click('.nav-item:has-text("Contacts")');
    await page.waitForTimeout(500);
  }},
  { name: "quickchat-sheet", path: "/", setup: async (page) => {
    await page.click('.nav-item:has-text("Contacts")');
    await page.waitForTimeout(500);
    const fab = page.locator('.quickchat-fab');
    if (await fab.isVisible()) {
      await fab.click();
      await page.waitForTimeout(600); // wait for spring animation
    }
  }},
  { name: "suggestion-bar", path: "/", setup: async (page) => {
    await page.click('.nav-item:has-text("Reminders")');
    await page.waitForTimeout(500);
  }},
];

const themes = ["light", "dark"];

function compareImages(buf1, buf2) {
  if (buf1.length !== buf2.length) return false;
  return buf1.equals(buf2);
}

async function run() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  console.log("Screenshot comparison loop started. Taking screenshots every " + INTERVAL / 1000 + "s");
  console.log("Output dir:", DIR);
  console.log("Pages:", pages.map(p => p.name).join(", "));
  console.log("Themes:", themes.join(", "));

  let iteration = 0;
  const tick = async () => {
    iteration++;
    const changes = [];

    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 }, // iPhone 14 size
        deviceScaleFactor: 2,
        colorScheme: theme,
      });

      for (const pg of pages) {
        const page = await context.newPage();
        try {
          await page.goto(BASE + pg.path, { waitUntil: "networkidle", timeout: 15000 });
          await page.waitForTimeout(500);

          // Set theme via toggle if needed
          if (theme === "dark") {
            await page.evaluate(() => {
              document.documentElement.setAttribute("data-theme", "dark");
              localStorage.setItem("theme", "dark");
            });
            await page.waitForTimeout(300);
          }

          // Run page-specific setup (navigate, open modals, etc.)
          if (pg.setup) {
            await pg.setup(page);
          }

          await page.waitForTimeout(300); // let animations settle

          const filename = `${pg.name}_${theme}.png`;
          const filepath = path.join(DIR, filename);
          const prevPath = path.join(DIR, `${pg.name}_${theme}_prev.png`);

          // Save previous version for comparison
          const newScreenshot = await page.screenshot({ fullPage: false });

          if (fs.existsSync(filepath)) {
            const oldScreenshot = fs.readFileSync(filepath);
            if (!compareImages(oldScreenshot, newScreenshot)) {
              // Rename old to _prev for visual diff
              fs.copyFileSync(filepath, prevPath);
              changes.push(`${pg.name} (${theme})`);
            }
          } else {
            changes.push(`${pg.name} (${theme}) [new]`);
          }

          fs.writeFileSync(filepath, newScreenshot);
          console.log(`  [${theme}] ${pg.name} -> ${filename}`);
        } catch (e) {
          console.error(`  [${theme}] ${pg.name} ERROR:`, e.message);
        } finally {
          await page.close();
        }
      }

      await context.close();
    }

    const ts = new Date().toISOString();
    if (changes.length > 0) {
      console.log(`[${ts}] #${iteration} CHANGES DETECTED: ${changes.join(", ")}`);
      console.log(`  Compare *_prev.png vs *.png in ${DIR}/ to see diffs`);
    } else {
      console.log(`[${ts}] #${iteration} No visual changes`);
    }
  };

  await tick();
  setInterval(tick, INTERVAL);
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
