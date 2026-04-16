import { createHash, randomUUID } from 'node:crypto'

function normalizeSeed(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function shortHash(seed, label, length = 8) {
    return createHash('sha256')
        .update(`${seed}:${label}`)
        .digest('hex')
        .slice(0, length)
}

export function createOnlineRunContext(seed = process.env.ONLINE_TEST_SEED || '') {
    const fallbackSeed = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`
    const effectiveSeed = normalizeSeed(seed) || normalizeSeed(fallbackSeed)
    const slug = effectiveSeed.slice(0, 18)
    const label = `mt-${slug}`

    return {
        seed: effectiveSeed,
        slug,
        label,
        startedAt: new Date().toISOString(),
    }
}

export function buildSyntheticUsers(runContext) {
    const baseA = shortHash(runContext.seed, 'user-a')
    const baseB = shortHash(runContext.seed, 'user-b')
    const mailSlug = runContext.slug.replace(/[^a-z0-9]/g, '').slice(0, 14)

    return [
        {
            username: `mt_${runContext.slug}_a`.slice(0, 32),
            email: `mt${mailSlug}${baseA}@example.org`,
            password: `MediTrace!${baseA}Aa`,
            firstName: 'QA',
            lastName: 'Operatore A',
            label: 'user-a',
        },
        {
            username: `mt_${runContext.slug}_b`.slice(0, 32),
            email: `mt${mailSlug}${baseB}@example.org`,
            password: `MediTrace!${baseB}Aa`,
            firstName: 'QA',
            lastName: 'Operatore B',
            label: 'user-b',
        },
    ]
}

export function buildSyntheticResidenze(runContext) {
    const marker = runContext.slug.toUpperCase()
    return [
        {
            codice: `QA ${marker} A`,
            maxOspiti: '7',
            note: `Synthetic concurrent validation ${runContext.seed} / user-a`,
            label: 'residenza-a',
        },
        {
            codice: `QA ${marker} B`,
            maxOspiti: '9',
            note: `Synthetic concurrent validation ${runContext.seed} / user-b`,
            label: 'residenza-b',
        },
    ]
}

export function buildSyntheticFarmaci(runContext) {
    const marker = runContext.slug.toUpperCase()
    return [
        {
            nomeFarmaco: `QA Farmaco ${marker} A`,
            principioAttivo: `QA PA ${marker} A`,
            classeTerapeutica: 'Validazione Sync',
            scortaMinima: '5',
            sogliaAutonomia: '30',
            label: 'farmaco-a',
        },
        {
            nomeFarmaco: `QA Farmaco ${marker} B`,
            principioAttivo: `QA PA ${marker} B`,
            classeTerapeutica: 'Validazione Sync',
            scortaMinima: '6',
            sogliaAutonomia: '35',
            label: 'farmaco-b',
        },
    ]
}

export function redactUser(user) {
    return {
        username: user.username,
        email: user.email,
        label: user.label,
    }
}