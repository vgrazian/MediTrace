---
name: ui-test-visual-qa
description: Visual regression testing and QA for MediTrace PWA. Captures multi-viewport screenshots, audits accessibility and console errors, and runs functional tests against the dev server. Adapted from cinjoff/fhhs-skills ui-test.
---

# UI Test & Visual QA — MediTrace

Visual verification and functional QA for the MediTrace PWA.

## Quick Start

Run the dev server and open the app:
```bash
cd pwa && npm run dev
```

Then invoke this skill with one of these modes:
- **Visual check**: `ui test` — screenshots at 3 breakpoints + design critique
- **QA mode**: `ui test --qa` — full functional testing against changed routes
- **Quick smoke**: `ui test --smoke` — fast sanity check after changes

---

## Mode 1: Visual Verification

### Step 1: Ensure Dev Server

Check if the Vite dev server is running:
```bash
lsof -i :5173 -P -n 2>/dev/null | grep -q LISTEN && echo "READY" || echo "NOT_RUNNING"
```

If NOT_RUNNING, start it:
```bash
cd pwa && npm run dev &
sleep 3
```

The base URL is `http://localhost:5173`.

---

### Step 2: Capture Screenshots

Use Playwright (already installed) to capture at 3 viewports:

```javascript
// Save as pwa/tests/visual/screenshots.js — run with: node pwa/tests/visual/screenshots.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Desktop: 1440×900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173');
  await page.screenshot({ path: 'pwa/tests/visual/desktop.png', fullPage: true });

  // Tablet: 768×1024
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: 'pwa/tests/visual/tablet.png', fullPage: true });

  // Mobile: 375×812
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'pwa/tests/visual/mobile.png', fullPage: true });

  await browser.close();
  console.log('Screenshots saved to pwa/tests/visual/');
})();
```

For authenticated pages, use the seeded user helper:
```javascript
const { loginOrRegisterSeededUser } = require('../e2e/helpers/login');
```

---

### Step 3: Console Health Check

In the browser console, evaluate:
```javascript
// Check for runtime errors
const errors = window.__consoleErrors || [];
console.log(JSON.stringify({ errors, count: errors.length }));
```

Flag: runtime errors, failed API calls, CORS issues, unhandled exceptions.

---

### Step 4: Design Critique

Evaluate each screenshot against MediTrace design principles:

1. **Visual hierarchy** — most important content prominent?
2. **Typography** — system font stack, consistent scale?
3. **Color** — semantic usage, contrast (WCAG AA)?
4. **Spacing** — consistent rhythm, sufficient whitespace?
5. **Responsive** — layout adapts across breakpoints?
6. **Accessibility** — heading hierarchy, labeled inputs, descriptive buttons?
7. **No visual regressions** — compare against known-good screenshots

Report issues with severity: **Critical / High / Medium / Low**.

---

### Step 5: Report Format

```
## Visual Verification Report — [date]

### Console Health
- Errors: [count]
- Warnings: [notable items]

### Screenshots
| Viewport | Path | Notes |
|----------|------|-------|
| Desktop  | pwa/tests/visual/desktop.png | — |
| Tablet   | pwa/tests/visual/tablet.png  | — |
| Mobile   | pwa/tests/visual/mobile.png  | — |

### Design Issues
| Severity | Issue | Breakpoint |
|----------|-------|------------|
| ... | ... | ... |

### Recommendation
[ Ship / Fix critical first / Needs rework ]
```

---

## Mode 2: QA Mode (--qa)

### Diff-Aware Testing

When on a feature branch, analyze what changed:

```bash
git diff main...HEAD --name-only | grep -E '\.(vue|js|css)$'
```

Map changed files to affected routes:
- `pwa/src/views/ResidenzeView.vue` → `/#/residenze`
- `pwa/src/views/FarmaciView.vue` → `/#/farmaci`
- `pwa/src/views/OspitiView.vue` → `/#/ospiti`
- `pwa/src/services/residenze.js` → `/#/residenze`
- etc.

For each affected route, run the relevant e2e test:
```bash
cd pwa && npx playwright test tests/e2e/residenze.spec.js --reporter=list
```

### Full QA Run

```bash
cd pwa && npx playwright test tests/e2e/ --reporter=html
```

### Key QA Checks per Panel

| Panel | Check |
|-------|-------|
| Residenze | Create + edit + delete + undo + keyboard shortcut N |
| Farmaci | Drug CRUD + batch CRUD + filter bar + auto-switch |
| Ospiti | Full anagrafica CRUD + cascade delete + bulk ops |
| Terapie | Create therapy + validation + guard rails |
| Movimenti | Carico/scarico + quantity validation + audit |
| Scorte | Stock visibility + threshold highlighting + edit |
| Promemoria | Status transitions + date filtering + edit/delete |
| Operatori | User CRUD + disable/enable + role checks |

---

## Mode 3: Quick Smoke (--smoke)

Fast pre-push sanity check:

```bash
cd pwa && npx playwright test tests/e2e/menu-navigation.spec.js tests/e2e/cross-browser-parity.spec.js --reporter=dot
```

---

## Automated Regression Check

After each build, verify key visual invariants:

```javascript
// pwa/tests/visual/regression.js
const { test, expect } = require('@playwright/test');

test('key pages load without console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  const routes = ['/', '/#/farmaci', '/#/ospiti', '/#/residenze', '/#/scorte'];
  for (const route of routes) {
    await page.goto(`http://localhost:5173${route}`);
    await page.waitForLoadState('networkidle');
  }

  expect(errors).toHaveLength(0);
});

test('no "Gestione" meta-labels in UI', async ({ page }) => {
  await page.goto('http://localhost:5173/#/residenze');
  // Verify on-demand panels, not always-visible twisties
  const twisties = page.locator('details summary strong');
  const labels = await twisties.allTextContents();
  const badLabels = labels.filter(l => /Gestione|Gestisci/.test(l));
  expect(badLabels).toHaveLength(0);
});
```

---

## Integration with CI

Add to `.github/workflows/visual-qa.yml`:

```yaml
name: Visual QA
on: [pull_request]
jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd pwa && npm ci
      - run: cd pwa && npx playwright install chromium
      - run: cd pwa && npm run build
      - run: cd pwa && npx playwright test tests/e2e/ --reporter=html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: pwa/playwright-report/
```
