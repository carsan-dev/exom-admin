import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect } from 'vitest'

/** Waits for the question opened through useConfirmDialog and returns its alertdialog. */
export function findConfirmDialog() {
  return screen.findByRole('alertdialog')
}

/**
 * Answers the open useConfirmDialog question with one of its default buttons, then waits until
 * the dialog is gone and Radix has restored focus, so the next assertion sees the settled UI.
 */
export async function answerConfirmDialog(answer: 'Aceptar' | 'Cancelar') {
  const dialog = await findConfirmDialog()
  await act(async () => { fireEvent.click(within(dialog).getByRole('button', { name: answer })) })
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  // Radix FocusScope restores the previous focus in a zero-delay timer after unmounting.
  await act(() => new Promise<void>((resolve) => { setTimeout(resolve, 0) }))
}

/*
 * Every alertdialog added to the document is recorded, including one that opened and closed again
 * before the test looked. Importing this module starts the record; it is cleared before each test.
 */
const shownDialogs: string[] = []
function recordDialogs(records: MutationRecord[]) {
  for (const record of records) {
    for (const node of Array.from(record.addedNodes)) {
      if (!(node instanceof Element)) continue
      const dialogs = [node, ...Array.from(node.querySelectorAll('[role="alertdialog"]'))]
      for (const dialog of dialogs) {
        if (dialog.getAttribute('role') === 'alertdialog') shownDialogs.push(dialog.textContent ?? '')
      }
    }
  }
}
const dialogObserver = new MutationObserver(recordDialogs)
dialogObserver.observe(document.body, { childList: true, subtree: true })
beforeEach(() => {
  dialogObserver.takeRecords()
  shownDialogs.length = 0
})

/** Text of every alertdialog shown since the current test started, whether still open or already closed. */
export function confirmDialogsShown() {
  recordDialogs(dialogObserver.takeRecords())
  return [...shownDialogs]
}
