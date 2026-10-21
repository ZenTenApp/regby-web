/**
 * Masked text field with an eye button that unmasks it. Ported from chat's
 * `MaskedInput`, for values hidden for screen privacy only, like the
 * subaccount name, where checking a typo matters more than for a passphrase.
 *
 * The masking is CSS over a plain text field so browsers never offer to save
 * it. That rests on `-webkit-text-security`; where it is missing the field
 * falls back to a real password field rather than showing the value.
 */
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import { ICON_SIZE } from './icon';

const CAN_MASK = typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc');

export function MaskedInput({ className = '', ...rest }: ComponentProps<'input'>) {
  const [revealed, setRevealed] = useState(false);
  const Icon = revealed ? EyeOff : Eye;
  const masked = !revealed && CAN_MASK;
  // One input in every state, so toggling swaps attributes on the same node
  // and the typed value, which lives only in the DOM, survives.
  return (
    <div className="masked">
      <input
        {...rest}
        type={revealed || CAN_MASK ? 'text' : 'password'}
        className={['input', masked && 'mask-chars', className].filter(Boolean).join(' ')}
      />
      <button
        type="button"
        className="masked-toggle"
        onClick={() => setRevealed((current) => !current)}
        // Keeps focus, and the caret, in the field.
        onMouseDown={(event) => event.preventDefault()}
        aria-label={revealed ? 'Hide' : 'Show'}
        aria-pressed={revealed}
      >
        <Icon size={ICON_SIZE} />
      </button>
    </div>
  );
}
