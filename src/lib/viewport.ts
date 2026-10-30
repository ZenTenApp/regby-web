/** Editable fields, the ones that raise the on-screen keyboard. */
const KEYBOARD_FIELD = ':read-write';

/**
 * Sizes `.page` to the visible viewport, so an on-screen keyboard shrinks the
 * card like a short screen does instead of covering its primary action. iOS
 * ignores `interactive-widget` and only shrinks the visual viewport, hence the
 * listener. When the keyboard opens over a field, the card scrolls to its foot
 * so the action shows, then back as far as the field needs.
 */
export function trackVisibleViewport(): void {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const root = document.documentElement;
  let lastHeight = 0;

  const update = () => {
    // Times scale, so pinch zoom (which also shrinks the visual viewport) leaves the layout alone.
    const height = Math.round(viewport.height * viewport.scale);
    if (height === lastHeight) return;
    const shrank = height < lastHeight;
    lastHeight = height;
    root.style.setProperty('--viewport-height', `${height}px`);
    // iOS pans the page up to reveal the field; the page now fits, so undo it.
    window.scrollTo(0, 0);

    const field = document.activeElement;
    if (!shrank || !field?.matches(KEYBOARD_FIELD)) return;
    const card = field.closest('.card');
    if (!card) return;
    card.scrollTop = card.scrollHeight;
    field.scrollIntoView({ block: 'nearest' });
  };

  update();
  viewport.addEventListener('resize', update);
}
