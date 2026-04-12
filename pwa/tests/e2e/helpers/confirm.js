export async function runWithAcceptedConfirmation(page, triggerAction) {
    let nativeDialogAccepted = false

    page.once('dialog', async dialog => {
        nativeDialogAccepted = true
        await dialog.accept()
    })

    await triggerAction()

    if (nativeDialogAccepted) return

    const modalConfirmButton = page.locator('.confirm-dialog .actions button').last()

    if (await modalConfirmButton.isVisible().catch(() => false)) {
        await modalConfirmButton.click()
        return
    }

    await modalConfirmButton
        .waitFor({ state: 'visible', timeout: 1500 })
        .then(() => modalConfirmButton.click())
        .catch(() => null)
}
