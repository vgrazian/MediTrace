# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: multi-user-sync.spec.js >> Saltato then Eseguito works without error
- Location: tests/e2e/multi-user-sync.spec.js:127:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.app-nav') to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - img "MediTrace" [ref=e5]
  - heading "MediTrace" [level=1] [ref=e6]
  - paragraph [ref=e7]: Accesso con utenza e password
  - generic [ref=e8]:
    - generic [ref=e9]: Username
    - textbox "Username" [ref=e10]:
      - /placeholder: Inserisci username
      - text: test
    - generic [ref=e11]: Password
    - textbox "Password" [ref=e12]:
      - /placeholder: Inserisci password
      - text: A7!vQ2#kLp9zXw4$eRt6@bY8^sJ0uH3m
    - button "Accedi" [ref=e13] [cursor=pointer]
    - generic [ref=e14]: Password dimenticata
    - textbox "Password dimenticata" [ref=e15]:
      - /placeholder: Inserisci email account
    - button "Invia link reset password" [disabled] [ref=e16]
  - paragraph [ref=e17]: Utente non trovato
  - paragraph [ref=e18]:
    - text: "Build: 21/06/2026, 18:49:22"
    - generic [ref=e19]: · gh-pages ddc26d7d (21/06/2026, 18:45:18)
  - button "⟳ Aggiorna app" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1   | /**
  2   |  * E2E Auth Helper — login/logout for Playwright tests.
  3   |  *
  4   |  * Uses the local auth system (IndexedDB-backed, no Supabase needed).
  5   |  * Credentials: dev seed account + default operators from auth.js
  6   |  */
  7   | 
  8   | const CREDENTIALS = {
  9   |     admin: { username: 'test', password: 'A7!vQ2#kLp9zXw4$eRt6@bY8^sJ0uH3m' },
  10  |     valerio: { username: 'valerio', password: 'V@lerio123!' },
  11  |     anna: { username: 'anna', password: 'Anna@456!Xy' },
  12  | }
  13  | 
  14  | /**
  15  |  * Navigate to the app and log in with the given credentials.
  16  |  * The app uses an in-App.vue login screen (not a separate route).
  17  |  * After login, the user stays on /#/ and the router-view renders.
  18  |  */
  19  | export async function login(page, user = 'admin') {
  20  |     const creds = CREDENTIALS[user]
  21  |     if (!creds) throw new Error(`Unknown test user: ${user}`)
  22  | 
  23  |     // Force a clean page load
  24  |     await page.goto('/#/', { waitUntil: 'domcontentloaded' })
  25  |     await page.waitForTimeout(2000)
  26  | 
  27  |     // Wait for the login form
  28  |     await page.waitForSelector('#username-input, #reg-username, button:has-text("Accedi")', { timeout: 15_000 })
  29  | 
  30  |     // Check if we need to register first (no users exist)
  31  |     const regBtn = page.locator('button:has-text("Crea account")')
  32  |     if (await regBtn.isVisible({ timeout: 3000 })) {
  33  |         await page.locator('#reg-username').fill(creds.username)
  34  |         await page.locator('#reg-first-name').fill('Test')
  35  |         await page.locator('#reg-last-name').fill('Admin')
  36  |         await page.locator('#reg-email').fill('test@meditrace.local')
  37  |         await page.locator('#reg-password').fill(creds.password)
  38  |         await page.locator('#reg-confirm-password').fill(creds.password)
  39  |         await regBtn.click()
  40  |     } else {
  41  |         await page.locator('#username-input').fill(creds.username)
  42  |         await page.locator('#password-input').fill(creds.password)
  43  |         await page.locator('button:has-text("Accedi")').click()
  44  |     }
  45  | 
  46  |     // Wait for app nav to appear (authenticated)
> 47  |     await page.waitForSelector('.app-nav', { timeout: 15_000 })
      |                ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  48  |     await page.waitForTimeout(2000)
  49  | }
  50  | 
  51  | /**
  52  |  * Log out: click Logout, confirm, then force-reload the login page.
  53  |  */
  54  | export async function logout(page) {
  55  |     const logoutBtn = page.locator('button:has-text("Logout")').first()
  56  |     if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  57  |         await logoutBtn.click()
  58  |         await page.waitForTimeout(500)
  59  | 
  60  |         const confirmBtn = page.locator('button:has-text("Esci")').first()
  61  |         if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  62  |             await confirmBtn.click()
  63  |             await page.waitForTimeout(1000)
  64  |         }
  65  |     }
  66  |     // Force a clean load so the login screen is fresh
  67  |     await page.goto('/#/', { waitUntil: 'domcontentloaded' })
  68  |     await page.waitForTimeout(2000)
  69  | }
  70  | export async function selectResidenza(page, residenzaLabel) {
  71  |     // Click the residence badge
  72  |     const badge = page.locator('.residenza-badge').first()
  73  |     await badge.click()
  74  | 
  75  |     // Click the target residence in dropdown
  76  |     const item = page.locator('.residenza-dropdown-item', { hasText: residenzaLabel }).first()
  77  |     await item.click()
  78  | 
  79  |     // Wait for data reload
  80  |     await page.waitForTimeout(2000)
  81  | }
  82  | 
  83  | /**
  84  |  * Generate demo data via the Impostazioni page.
  85  |  */
  86  | export async function generateDemoData(page) {
  87  |     await page.goto('/#/impostazioni', { waitUntil: 'domcontentloaded' })
  88  |     await page.waitForTimeout(2000)
  89  | 
  90  |     // Look for demo data button
  91  |     const genBtn = page.locator('button:has-text("Genera"), button:has-text("Dati demo"), button:has-text("demo")').first()
  92  |     if (await genBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  93  |         await genBtn.click()
  94  |         await page.waitForTimeout(4000)
  95  |         return true
  96  |     }
  97  |     return false
  98  | }
  99  | 
  100 | /**
  101 |  * Navigate to a view and wait for it to load.
  102 |  */
  103 | export async function goToView(page, viewPath) {
  104 |     await page.goto(`/#/${viewPath}`, { waitUntil: 'networkidle' })
  105 |     await page.waitForTimeout(1500)
  106 | }
  107 | 
  108 | export { CREDENTIALS }
  109 | 
```