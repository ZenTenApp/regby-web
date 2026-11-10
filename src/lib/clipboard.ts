/** Shown when a Paste button's clipboard read is refused (permission, insecure origin). */
export const CLIPBOARD_BLOCKED_TEXT = 'Clipboard access was blocked. Paste into the field instead.';

/** The clipboard's text, or null when the browser refuses the read. */
export async function readClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/** Overwrites the clipboard so a pasted secret is not left for the next paste
 *  or another page's read; false when the browser refuses the write. */
export async function clearClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText('');
    return true;
  } catch {
    return false;
  }
}
