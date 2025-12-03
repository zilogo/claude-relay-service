const hasClipboardApi =
  typeof navigator !== 'undefined' &&
  navigator.clipboard &&
  typeof navigator.clipboard.writeText === 'function'

const hasDocument = typeof document !== 'undefined'

function fallbackCopy(text) {
  if (!hasDocument) {
    throw new Error('Clipboard API unavailable')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  let succeeded = false
  try {
    succeeded = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
    if (selection) {
      selection.removeAllRanges()
      if (selectedRange) {
        selection.addRange(selectedRange)
      }
    }
  }

  if (!succeeded) {
    throw new Error('Fallback copy command was unsuccessful')
  }
}

export async function copyTextToClipboard(text) {
  if (!text && text !== '') {
    throw new Error('Nothing to copy')
  }

  if (hasClipboardApi) {
    await navigator.clipboard.writeText(text)
    return
  }

  fallbackCopy(text)
}
