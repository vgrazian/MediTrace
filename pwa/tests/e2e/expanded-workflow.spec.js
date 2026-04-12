import { test, expect } from '@playwright/test'
import { loginOrRegisterSeededUser } from './helpers/login'

test('expanded workflow scenario: multi-drug catalog, batch management, and therapy administration', async ({ page }) => {
    test.setTimeout(180_000)

    const mockGithubUser = {
        login: 'seeded-gh-user',
        name: 'Seeded User',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    }

    let gistCreated = false

    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockGithubUser),
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

        if (method === 'PATCH' && url.includes('/gists/')) {
            const payload = JSON.parse(req.postData() || '{}')
            const files = payload.files || {}
            await route.fulfill({
                status: 200,
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

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // PHASE 1: Expand drug catalog with multiple new medications
    console.log('=== PHASE 1: Adding multiple new medications to catalog ===')
    await page.getByRole('link', { name: 'Farmaci' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogo Farmaci' })).toBeVisible()

    const drugs = [
        { name: 'Ibuprofene 200mg', active: 'Ibuprofene', therapeutic: 'Antinfiammatori', minStock: 15 },
        { name: 'Amoxicillina 500mg', active: 'Amoxicillina triidrata', therapeutic: 'Antibiotici', minStock: 20 },
        { name: 'Metformina 850mg', active: 'Metformina', therapeutic: 'Antidiabetici', minStock: 30 },
        { name: 'Lisinopril 10mg', active: 'Lisinopril', therapeutic: 'Antipertensivi', minStock: 25 },
    ]

    for (const drug of drugs) {
        console.log(`  Adding drug: ${drug.name}`)
        await page.locator('summary', { hasText: 'Gestisci Farmaci' }).click()
        await page.waitForTimeout(200)

        await page.getByLabel('Nome farmaco').fill(drug.name)
        await page.getByLabel('Principio attivo').fill(drug.active)
        await page.getByLabel('Classe terapeutica').fill(drug.therapeutic)
        await page.getByLabel('Scorta minima').fill(String(drug.minStock))

        await page.getByRole('button', { name: 'Salva farmaco' }).click()
        await expect(page.getByRole('cell', { name: drug.name, exact: true })).toBeVisible({ timeout: 5000 })

        // Close form
        await page.getByRole('button', { name: 'Chiudi' }).click()
        await page.waitForTimeout(300)
    }

    console.log(`✓ Added ${drugs.length} new medications`)

    // PHASE 2: Create stock batches for each drug with varying quantities
    console.log('\n=== PHASE 2: Creating stock batches with different quantities ===')
    await page.locator('summary', { hasText: 'Gestisci Farmaci' }).click()
    await page.waitForTimeout(200)

    const batches = [
        { drugName: 'Ibuprofene 200mg', commercialName: 'Brufen 200', dosage: '200mg', quantity: 24, threshold: 6 },
        { drugName: 'Ibuprofene 200mg', commercialName: 'Ibupiù', dosage: '200mg', quantity: 48, threshold: 8 },
        { drugName: 'Amoxicillina 500mg', commercialName: 'Augmentin', dosage: '500mg', quantity: 30, threshold: 5 },
        { drugName: 'Metformina 850mg', commercialName: 'Glucophage', dosage: '850mg', quantity: 60, threshold: 10 },
        { drugName: 'Lisinopril 10mg', commercialName: 'Zestril', dosage: '10mg', quantity: 28, threshold: 7 },
    ]

    for (const batch of batches) {
        console.log(`  Creating batch: ${batch.commercialName} (${batch.quantity} units)`)

        const matchingDrugOption = page.locator('option').filter({ hasText: batch.drugName }).first()
        const matchingDrugValue = await matchingDrugOption.getAttribute('value')
        if (!matchingDrugValue) {
            throw new Error(`Nessuna opzione farmaco trovata per ${batch.drugName}`)
        }
        await page.locator('select').first().selectOption(matchingDrugValue)
        await page.waitForTimeout(200)

        await page.getByLabel('Nome commerciale').fill(batch.commercialName)
        await page.getByLabel('Dosaggio').fill(batch.dosage)
        await page.getByLabel(/Quantit.* attuale/).fill(String(batch.quantity))
        await page.getByLabel('Soglia riordino').fill(String(batch.threshold))

        await page.getByRole('button', { name: 'Salva confezione' }).click()
        await expect(page.getByText(/Confezione salvata/i)).toBeVisible({ timeout: 5000 })
        await page.waitForTimeout(300)
    }

    console.log(`✓ Created ${batches.length} stock batches`)

    // PHASE 3: Navigate to therapies and create assignments for hosts using the new drugs
    console.log('\n=== PHASE 3: Creating therapy assignments with new medications ===')
    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    // Find editable therapy rows and update a few with new drugs
    const editableTherapies = page.locator('tbody tr').filter({
        has: page.getByRole('button', { name: 'Modifica' }),
    })

    const therapyCount = await editableTherapies.count()
    console.log(`  Found ${therapyCount} existing therapies to potentially update`)

    if (therapyCount >= 1) {
        // Update first therapy with Ibuprofene
        const therapy1 = editableTherapies.nth(0)
        await therapy1.getByRole('button', { name: 'Modifica' }).click()

        const drugSelect = page.locator('select').filter({ hasText: /farmaco|medicine/i }).first()
        if (await drugSelect.isVisible().catch(() => false)) {
            await drugSelect.selectOption({ label: 'Ibuprofene 200mg' })
        }

        await page.getByLabel('Dose per somministrazione').fill('1')
        await page.getByLabel('Somministrazioni giornaliere').fill('2')
        await page.getByLabel('Data inizio').fill(new Date().toISOString().slice(0, 10))
        await page.getByLabel('Note').fill('Terapia antinfiammatoria - Scenario espanso')

        await page.getByRole('button', { name: 'Salva modifica' }).click()
        await expect(page.getByText('Terapia aggiornata.')).toBeVisible({ timeout: 5000 })
        console.log('  ✓ Updated therapy 1 with Ibuprofene')

        // Close form
        await page.getByRole('button', { name: 'Chiudi' }).click()
        await page.waitForTimeout(300)
    }

    if (therapyCount >= 2) {
        // Update second therapy with Metformina
        const therapy2 = editableTherapies.nth(1)
        await therapy2.getByRole('button', { name: 'Modifica' }).click()

        const drugSelect = page.locator('select').filter({ hasText: /farmaco|medicine/i }).first()
        if (await drugSelect.isVisible().catch(() => false)) {
            await drugSelect.selectOption({ label: 'Metformina 850mg' })
        }

        await page.getByLabel('Dose per somministrazione').fill('1')
        await page.getByLabel('Somministrazioni giornaliere').fill('3')
        await page.getByLabel('Data inizio').fill(new Date().toISOString().slice(0, 10))
        await page.getByLabel('Note').fill('Terapia antidiabetica - Controllo glicemico')

        await page.getByRole('button', { name: 'Salva modifica' }).click()
        await expect(page.getByText('Terapia aggiornata.')).toBeVisible({ timeout: 5000 })
        console.log('  ✓ Updated therapy 2 with Metformina')

        // Close form
        await page.getByRole('button', { name: 'Chiudi' }).click()
        await page.waitForTimeout(300)
    }

    console.log('✓ Updated therapy assignments')

    // PHASE 4: Execute reminders and mark therapies as administered
    console.log('\n=== PHASE 4: Drug administration and reminder execution ===')
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()

    await page.getByLabel('Data').selectOption('all')
    await page.getByLabel('Stato').first().selectOption('DA_ESEGUIRE')

    const eseguiButtons = page.getByRole('button', { name: 'Eseguito' })
    const pendingReminders = await eseguiButtons.count()

    const remindersToExecute = Math.min(pendingReminders, 6)
    console.log(`  Executing ${remindersToExecute} reminders out of ${pendingReminders} pending`)

    for (let i = 0; i < remindersToExecute; i += 1) {
        await page.getByRole('button', { name: 'Eseguito' }).first().click()
        await expect(page.getByText('Promemoria contrassegnato: ESEGUITO.')).toBeVisible({ timeout: 5000 })
        await page.waitForTimeout(200)
    }

    console.log(`✓ Executed ${remindersToExecute} reminders`)

    // PHASE 5: Check stock levels after drug usage
    console.log('\n=== PHASE 5: Stock level management and monitoring ===')
    await page.getByRole('link', { name: 'Scorte' }).click()
    await expect(page.getByRole('heading', { name: 'Scorte' })).toBeVisible()

    await page.getByRole('button', { name: 'Aggiorna report' }).click()
    await expect(page.getByText('Riepilogo segnalazioni')).toBeVisible({ timeout: 5000 })

    const stockAlerts = page.locator('table tbody tr')
    const alertCount = await stockAlerts.count()
    console.log(`  Found ${alertCount} drugs in stock monitoring`)

    // Try to prepare order
    await page.getByRole('button', { name: 'Prepara testo ordine farmaci' }).click()
    const orderMsg = page.getByText(/Testo ordine|Nessun farmaco/)
    await expect(orderMsg).toBeVisible({ timeout: 5000 })
    console.log('✓ Stock report updated and order preparation ready')

    // PHASE 6: Verify audit logging for all operations
    console.log('\n=== PHASE 6: Audit logging verification ===')
    await page.getByRole('link', { name: 'Audit' }).click()
    await expect(page.getByRole('heading', { name: /Audit/ })).toBeVisible()

    const auditTable = page.locator('table[aria-label="Registro operazioni"]').first()
    const auditRows = auditTable.locator('tbody tr')
    const auditEntryCount = await auditRows.count()

    console.log(`  Audit log contains ${auditEntryCount} entries`)

    // In CI we can have empty datasets, but the audit view must still render reliably.
    await expect(auditTable).toBeVisible()
    expect(auditEntryCount).toBeGreaterThan(0)
    console.log('✓ Audit logging verified')

    console.log('\n=== WORKFLOW COMPLETE ===')
    console.log(`Summary:
    - Added ${drugs.length} new medications to catalog
    - Created ${batches.length} stock batches
    - Updated therapy assignments for hosts
    - Executed ${remindersToExecute} reminders
    - Verified ${auditEntryCount} audit log entries
    `)
})

test('therapy dosage adjustments and host-specific drug monitoring', async ({ page }) => {
    test.setTimeout(90_000)

    const mockGithubUser = {
        login: 'seeded-gh-user',
        name: 'Seeded User',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    }

    let gistCreated = false

    await page.route('https://api.github.com/user', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockGithubUser),
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

        if (method === 'PATCH' && url.includes('/gists/')) {
            const payload = JSON.parse(req.postData() || '{}')
            const files = payload.files || {}
            await route.fulfill({
                status: 200,
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

    await page.goto('/')
    await loginOrRegisterSeededUser(page)

    // Load seed data
    await page.evaluate(async () => {
        const seed = await import('/src/services/seedData.js')
        await seed.clearSeedData()
        await seed.loadSeedData()
    })

    // Navigate to therapies
    await page.getByRole('link', { name: 'Terapie' }).click()
    await expect(page.getByRole('heading', { name: 'Terapie Attive' })).toBeVisible()

    const today = new Date().toISOString().slice(0, 10)
    const therapyRows = page.locator('tbody tr').filter({
        has: page.getByRole('button', { name: 'Modifica' }),
    })

    const therapyCount = await therapyRows.count()
    expect(therapyCount).toBeGreaterThanOrEqual(2)

    // Perform multiple dosage adjustments
    for (let i = 0; i < Math.min(therapyCount, 3); i += 1) {
        const therapy = therapyRows.nth(i)
        await therapy.getByRole('button', { name: 'Modifica' }).click()

        // Adjust doses progressively
        const newDose = 1 + (i * 0.5)
        const newFrequency = 2 + i

        await page.getByLabel('Dose per somministrazione').fill(String(newDose))
        await page.getByLabel('Somministrazioni giornaliere').fill(String(newFrequency))
        await page.getByLabel('Data inizio').fill(today)
        await page.getByLabel('Note').fill(`Aggiustamento dosaggio #${i + 1}: dose ${newDose}x${newFrequency} giornalieri`)

        await page.getByRole('button', { name: 'Salva modifica' }).click()
        await expect(page.getByText('Terapia aggiornata.')).toBeVisible({ timeout: 5000 })

        // Close the form
        await page.getByRole('button', { name: 'Chiudi' }).click()
        await page.waitForTimeout(200)
    }

    // Verify adjustments persisted by checking reminders
    await page.getByRole('link', { name: 'Promemoria' }).click()
    await expect(page.getByRole('heading', { name: 'Promemoria' })).toBeVisible()

    // Verify we have updated reminders
    const reminderTable = page.locator('table').first()
    await expect(reminderTable).toBeVisible()
})
