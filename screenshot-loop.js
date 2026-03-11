const { chromium } = require("playwright-core");

const BASE = "http://localhost:3000";
const DIR = __dirname + "/screenshots";
const INTERVAL = 10000; // 10 seconds

const pages = [
  { name: "chat", path: "/" },
];

async function run() {
  const browser = await chromium.launch({
    executablePath: "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  console.log("Screenshot loop started. Taking screenshots every " + INTERVAL / 1000 + "s");
  console.log("Output dir:", DIR);

  let iteration = 0;
  const tick = async () => {
    iteration++;
    for (const pg of pages) {
      const page = await context.newPage();
      try {
        await page.goto(BASE + pg.path, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(1000); // let animations settle
        const file = `${DIR}/${pg.name}_latest.png`;
        await page.screenshot({ path: file, fullPage: false });
        console.log(`[${new Date().toISOString()}] #${iteration} ${pg.name} -> ${file}`);
      } catch (e) {
        console.error(`[${new Date().toISOString()}] #${iteration} ${pg.name} ERROR:`, e.message);
      } finally {
        await page.close();
      }
    }
  };

  await tick();
  setInterval(tick, INTERVAL);
}

run().catch((e) => { console.error("Fatal:", e); process.exit(1); });
