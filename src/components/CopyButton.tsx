import { Check, CircleAlert, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ICON_SIZE } from './icon';

const COPIED_FEEDBACK_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

const ICON = { idle: Copy, copied: Check, failed: CircleAlert } as const;
const CHIP_TEXT: Record<CopyState, string> = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' };

/** `icon` sits inline beside what it copies and needs `label` (what is copied)
 *  for its accessible name; `chip` is the labelled action under a field. */
type CopyButtonProps = { text: string; disabled?: boolean } & (
  | { variant: 'icon'; label: string }
  | { variant: 'chip' }
);

/** Copies `text` verbatim and confirms in place, so every copy action in the
 *  app gives the same feedback without its own state. */
export function CopyButton(props: CopyButtonProps) {
  const { text, disabled = false } = props;
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const id = setTimeout(() => setState('idle'), COPIED_FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  const Icon = ICON[state];
  if (props.variant === 'chip') {
    return (
      <button type="button" className="chip" disabled={disabled} onClick={() => void copy()}>
        <Icon size={ICON_SIZE} />
        {CHIP_TEXT[state]}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="icon-button"
      data-state={state}
      disabled={disabled}
      aria-label={state === 'idle' ? `Copy ${props.label}` : `${props.label}: ${CHIP_TEXT[state]}`}
      onClick={() => void copy()}
    >
      <Icon size={ICON_SIZE} />
    </button>
  );
}
