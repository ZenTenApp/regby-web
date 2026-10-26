/**
 * Masked text field with an eye button that unmasks it. Ported from chat's
 * `MaskedInput`, for values worth checking for a typo before submit, like the
 * SSH passphrase and the subaccount name.
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
        // A text field, unlike a password one, is spellchecked (Chrome's enhanced
        // spellcheck sends it off-device) and autocorrected or learned by phone
        // keyboards. Set after `rest` so no caller can turn these back on.
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
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
