/** Editable fields, the ones that raise the on-screen keyboard. */
const KEYBOARD_FIELD = ':read-write';

/**
 * A block whose fields need what follows them (e.g. a Paste button) in view:
 * when one raises the keyboard, the whole block shows, its foot at the bottom,
 * instead of the field moving to the top.
 */
const REVEAL_BLOCK = '[data-keyboard-reveal]';

/**
 * When the on-screen keyboard opens over a field, scrolls that field to the
 * top of what stays visible, so the action below it shows too (or, inside a
 * `REVEAL_BLOCK`, that block's foot to the bottom). The keyboard
 * only shrinks the visual viewport (`interactive-widget=resizes-visual`), so
 * the page keeps its size and the scroll pans over it instead of reflowing it.
 */
export function revealFieldAboveKeyboard(): void {
  const viewport = window.visualViewport;
  if (!viewport) return;
  // Times scale, so pinch zoom (which also shrinks the visual viewport) is not mistaken for a keyboard.
  const visibleHeight = () => viewport.height * viewport.scale;
  let lastHeight = visibleHeight();

  viewport.addEventListener('resize', () => {
    const height = visibleHeight();
    const shrank = height < lastHeight;
    lastHeight = height;
    const field = document.activeElement;
    if (!shrank || !field?.matches(KEYBOARD_FIELD)) return;
    const block = field.closest(REVEAL_BLOCK);
    if (block) block.scrollIntoView({ block: 'end' });
    else field.scrollIntoView({ block: 'start' });
  });
}
