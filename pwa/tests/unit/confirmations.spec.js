import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    confirmDestructiveAction,
    confirmDeleteHost,
    confirmDeleteDrug,
    confirmDeleteBatch,
    confirmDeleteReminder,
    confirmDeleteMovement,
    confirmDeleteUser,
    confirmDeactivateTherapy,
    confirmDeactivateRoom,
    confirmDeleteMultiple
} from '../../src/services/confirmations'

describe('confirmations service', () => {
    let confirmSpy

    beforeEach(() => {
        // Mock global confirm function
        confirmSpy = vi.fn()
        global.confirm = confirmSpy
    })

    afterEach(() => {
        delete global.confirm
    })

    describe('confirmDestructiveAction', () => {
        it('shows confirmation dialog with title and message', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDestructiveAction({
                title: 'Test Title',
                message: 'Test message'
            })

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Test Title')
            expect(callArg).toContain('Test message')
        })

        it('includes item name and type when provided', async () => {
            confirmSpy.mockReturnValue(true)

            await confirmDestructiveAction({
                title: 'Delete Item',
                message: 'Are you sure?',
                itemName: 'Test Item',
                itemType: 'Item Type'
            })

            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Test Item')
            expect(callArg).toContain('Item Type')
        })

        it('includes consequences when provided', async () => {
            confirmSpy.mockReturnValue(true)

            await confirmDestructiveAction({
                title: 'Delete Item',
                message: 'Are you sure?',
                consequences: [
                    'Consequence 1',
                    'Consequence 2'
                ]
            })

            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Conseguenze:')
            expect(callArg).toContain('Consequence 1')
            expect(callArg).toContain('Consequence 2')
        })

        it('includes warning about irreversibility', async () => {
            confirmSpy.mockReturnValue(true)

            await confirmDestructiveAction({
                title: 'Delete Item',
                message: 'Are you sure?'
            })

            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('non può essere annullata')
        })

        it('returns false when user cancels', async () => {
            confirmSpy.mockReturnValue(false)

            const result = await confirmDestructiveAction({
                title: 'Delete Item',
                message: 'Are you sure?'
            })

            expect(result).toBe(false)
        })
    })

    describe('confirmDeleteHost', () => {
        it('shows host-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteHost('Mario Rossi')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Elimina Ospite')
            expect(callArg).toContain('Mario Rossi')
            expect(callArg).toContain('terapie associate')
            expect(callArg).toContain('promemoria')
        })
    })

    describe('confirmDeleteDrug', () => {
        it('shows drug-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteDrug('Paracetamolo')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Elimina Farmaco')
            expect(callArg).toContain('Paracetamolo')
            expect(callArg).toContain('confezioni in magazzino')
            expect(callArg).toContain('terapie attive')
        })
    })

    describe('confirmDeleteBatch', () => {
        it('shows batch-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteBatch('Lotto ABC123')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Elimina Confezione')
            expect(callArg).toContain('Lotto ABC123')
            expect(callArg).toContain('quantità disponibile')
            expect(callArg).toContain('soglia minima')
        })
    })

    describe('confirmDeleteReminder', () => {
        it('shows reminder-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteReminder('Promemoria ore 10:00')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Elimina Promemoria')
            expect(callArg).toContain('Promemoria ore 10:00')
            expect(callArg).toContain('rimosso definitivamente')
            expect(callArg).toContain('notifiche programmate')
        })
    })

    describe('confirmDeleteMovement', () => {
        it('shows movement-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteMovement('Carico 10 unità')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Elimina Movimento')
            expect(callArg).toContain('Carico 10 unità')
            expect(callArg).toContain('cronologia')
            expect(callArg).toContain('inconsistenti')
        })
    })

    describe('confirmDeleteUser', () => {
        it('shows user-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteUser('testuser')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Elimina Utente')
            expect(callArg).toContain('testuser')
            expect(callArg).toContain('non potrà più accedere')
            expect(callArg).toContain('sessioni attive')
        })
    })

    describe('confirmDeactivateTherapy', () => {
        it('shows therapy-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeactivateTherapy('Terapia Paracetamolo')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Disattiva Terapia')
            expect(callArg).toContain('Terapia Paracetamolo')
            expect(callArg).toContain('marcata come terminata')
            expect(callArg).toContain('promemoria futuri')
        })
    })

    describe('confirmDeactivateRoom', () => {
        it('shows room-specific confirmation with consequences', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeactivateRoom('Stanza 101')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('Disattiva Stanza')
            expect(callArg).toContain('Stanza 101')
            expect(callArg).toContain('non sarà più disponibile')
            expect(callArg).toContain('riassegnati')
        })
    })

    describe('confirmDeleteMultiple', () => {
        it('shows singular wording for one selected item', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteMultiple(1, 'farmaco')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('eliminare questo farmaco')
            expect(callArg).toContain('non può essere annullata')
        })

        it('shows plural wording for multiple selected items', async () => {
            confirmSpy.mockReturnValue(true)

            const result = await confirmDeleteMultiple(3, 'farmaci')

            expect(confirmSpy).toHaveBeenCalled()
            expect(result).toBe(true)
            const callArg = confirmSpy.mock.calls[0][0]
            expect(callArg).toContain('eliminare 3 farmaci')
            expect(callArg).toContain('eliminerà 3 farmaci')
        })
    })

    describe('user cancellation', () => {
        it('returns false for all confirmation types when user cancels', async () => {
            confirmSpy.mockReturnValue(false)

            expect(await confirmDeleteHost('Test')).toBe(false)
            expect(await confirmDeleteDrug('Test')).toBe(false)
            expect(await confirmDeleteBatch('Test')).toBe(false)
            expect(await confirmDeleteReminder('Test')).toBe(false)
            expect(await confirmDeleteMovement('Test')).toBe(false)
            expect(await confirmDeleteUser('Test')).toBe(false)
            expect(await confirmDeactivateTherapy('Test')).toBe(false)
            expect(await confirmDeactivateRoom('Test')).toBe(false)
            expect(await confirmDeleteMultiple(2, 'elementi')).toBe(false)
        })
    })
})

// Made with Bob
