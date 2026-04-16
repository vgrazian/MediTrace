import { test, expect } from '@playwright/test'

test('reset password route is reachable and shows local-mode guard message', async ({ page }) => {
    await page.goto('/#/auth/reset-password')

    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible()
    await expect(page.getByLabel('Nuova password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Conferma nuova password')).toBeVisible()

    await page.getByLabel('Nuova password', { exact: true }).fill('NuovaPassword123!')
    await page.getByLabel('Conferma nuova password').fill('NuovaPassword123!')
    await page.getByRole('button', { name: 'Aggiorna password' }).click()

    await expect(page.getByText(/recupero password via link email non disponibile in questa modalita/i)).toBeVisible()
})