import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const notificationInstances = []

        class MockNotification {
            static permission = 'default'

            static async requestPermission() {
                MockNotification.permission = 'granted'
                return 'granted'
            }

            constructor(title, options = {}) {
                this.title = title
                this.options = options
                this.onclick = null
                notificationInstances.push(this)
            }

            close() { }
        }

        Object.defineProperty(window, 'Notification', {
            configurable: true,
            writable: true,
            value: MockNotification,
        })

        window.__meditraceNotifications = notificationInstances
    })

    let gistCreated = false

    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                login: 'seeded-gh-user',
                name: 'Seeded User',
                avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
            }),
        })
    })

    await page.route('https://api.github.com/gists*', async route => {
        const req = route.request()
        const method = req.method()
        const url = req.url()

        if (method === 'GET' && url.includes('/gists?')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(gistCreated ? [{ id: 'gist-seeded-id', description: 'MediTrace — dati personali (non modificare manualmente)' }] : []),
            })
            return
        }

        if (method === 'POST' && url.endsWith('/gists')) {
            gistCreated = true
            const payload = JSON.parse(req.postData() || '{}')
            const files = payload.files || {}

            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'gist-seeded-id',
                    updated_at: new Date().toISOString(),
                    files: Object.fromEntries(
                        Object.entries(files).map(([name, value]) => [name, { filename: name, content: value.content || '{}' }]),
                    ),
                }),
            })
            return
        }

        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) })
    })
})

test('notification enable, test send, and reminder deep-link are exercisable automatically', async ({ page }) => {
    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    await page.getByRole('link', { name: '⚙' }).click()
    await expect(page.getByRole('heading', { name: 'Impostazioni' })).toBeVisible()

    await page.getByRole('button', { name: 'Abilita notifiche' }).click()
    await expect(page.getByText('Notifiche abilitate su questo dispositivo.')).toBeVisible()

    await page.getByRole('button', { name: 'Invia notifica test' }).click()
    await expect(page.getByText('Notifica di test inviata.')).toBeVisible()

    const testNotificationCount = await page.evaluate(() => window.__meditraceNotifications.length)
    expect(testNotificationCount).toBe(1)

    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open('meditrace')
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const database = request.result
                const tx = database.transaction('reminders', 'readwrite')
                tx.objectStore('reminders').put({
                    id: 'reminder-e2e-1',
                    therapyId: 'therapy-1',
                    hostId: 'host-1',
                    scheduledAt: new Date(Date.now() + 60_000).toISOString(),
                    stato: 'DA_ESEGUIRE',
                    updatedAt: new Date().toISOString(),
                    syncStatus: 'pending',
                })
                tx.oncomplete = () => resolve(true)
                tx.onerror = () => reject(tx.error)
            }
        })
    })

    await page.getByRole('button', { name: 'Verifica promemoria imminenti' }).click()
    await expect(page.getByText('Controllo promemoria imminenti eseguito.')).toBeVisible()

    const reminderNotificationCount = await page.evaluate(() => window.__meditraceNotifications.length)
    expect(reminderNotificationCount).toBe(2)

    await page.evaluate(() => {
        const reminderNotification = window.__meditraceNotifications[1]
        reminderNotification.onclick()
    })

    await expect(page).toHaveURL(/#\/promemoria\?highlight=reminder-e2e-1/)
    await expect(page.getByText('Evidenziato da notifica: reminder-e2e-1')).toBeVisible()
    // Highlighted reminder row appears in the table (new view shows ospite/farmaco labels, not raw IDs)
    await expect(page.locator('tr.reminder-highlight')).toBeVisible()
})
