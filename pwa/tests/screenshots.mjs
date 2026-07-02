// Minimal approach: capture from the live GitHub Pages site
// The live site at vgrazian.github.io/MediTrace may have demo data
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/presentation');
const LIVE_URL = 'https://vgrazian.github.io/MediTrace';
const LOCAL_URL = 'http://127.0.0.1:8765';

const pages = [
  { name: 'screen-cruscotto', route: '/#/' },
  { name: 'screen-ospiti', route: '/#/ospiti' },
  { name: 'screen-farmaci', route: '/#/farmaci' },
  { name: 'screen-scorte', route: '/#/scorte' },
  { name: 'screen-movimenti', route: '/#/movimenti' },
  { name: 'screen-terapie', route: '/#/terapie' },
  { name: 'screen-promemoria', route: '/#/promemoria' },
  { name: 'screen-audit', route: '/#/audit' },
];

(async () => {
  // Try local first, fall back to live
  for (const baseUrl of [LOCAL_URL, LIVE_URL]) {
    console.log(`\nTrying: ${baseUrl}`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    try {
      await page.goto(baseUrl, { waitUntil: 'commit', timeout: 10000 });
      await page.waitForTimeout(3000);

      for (const { name, route } of pages) {
        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 10000 });
          await page.waitForTimeout(2000);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${name}.png`),
            fullPage: false,
          });
          console.log(`  ${name}.png saved`);
        } catch (e) {
          console.log(`  ${name}: ${e.message}`);
        }
      }
      console.log('Done with', baseUrl);
      await browser.close();
      return; // Success
    } catch (e) {
      console.log(`Failed: ${e.message}`);
      await browser.close();
    }
  }

  console.log('Could not capture from any source.');
})();
