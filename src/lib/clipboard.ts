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
