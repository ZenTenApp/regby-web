import { Check, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

// Figma's own copy glyph rather than lucide's, to match the design.
import CopyIcon from '@/assets/icons/copy.svg?react';

import { ICON_SIZE } from './icon';

const COPIED_FEEDBACK_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

const ICON = { idle: CopyIcon, copied: Check, failed: CircleAlert } as const;
const STATE_TEXT: Record<Exclude<CopyState, 'idle'>, string> = { copied: 'Copied', failed: 'Copy failed' };

/** `icon` sits inline beside what it copies; `text` is a labelled action
 *  ("Copy content"). Both name what is copied with `label`. */
interface CopyButtonProps {
  variant: 'icon' | 'text';
  text: string;
  label: string;
}

/** Copies `text` verbatim and confirms in place, so every copy action in the
 *  app gives the same feedback without its own state. */
export function CopyButton({ variant, text, label }: CopyButtonProps) {
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
  // width/height rather than lucide's `size`, which the SVGR glyph lacks.
  const icon = <Icon width={ICON_SIZE} height={ICON_SIZE} />;
  if (variant === 'text') {
    return (
      <button
        type="button"
        className="text-button"
        data-state={state}
        onClick={() => void copy()}
      >
        {icon}
        {state === 'idle' ? `Copy ${label}` : STATE_TEXT[state]}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="icon-button"
      data-state={state}
      aria-label={state === 'idle' ? `Copy ${label}` : `${label}: ${STATE_TEXT[state]}`}
      onClick={() => void copy()}
    >
      {icon}
    </button>
  );
}
