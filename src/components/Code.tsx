/**
 * The 8-digit code as four coloured pairs, read-only for the merchant and as
 * inputs for the customer. Both share the grouping and colours so the digits
 * a customer types sit under the same bars they read off the merchant screen.
 */
import { Clipboard } from 'lucide-react';
import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from 'react';

import { REGBY_CODE_GROUP, REGBY_CODE_LENGTH } from '@/config/regby';
import { CLIPBOARD_BLOCKED_TEXT, readClipboard } from '@/lib/clipboard';

import { ICON_SIZE } from './icon';

const GROUP_COUNT = REGBY_CODE_LENGTH / REGBY_CODE_GROUP;
const GROUPS = Array.from({ length: GROUP_COUNT }, (_, i) => i);
const barColor = (group: number) => ({ '--bar': `var(--code-${group + 1})` }) as CSSProperties;

const groupOf = (value: string, group: number) =>
  value.slice(group * REGBY_CODE_GROUP, (group + 1) * REGBY_CODE_GROUP);

/** Whether a key or paste belongs to some other field rather than the code. */
const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null);

/** Clipboard text as code digits, or null if it is not purely digits. */
const pastedDigits = (text: string) => {
  const digits = text.replace(/\s+/g, '');
  return /^\d+$/.test(digits) ? digits.slice(0, REGBY_CODE_LENGTH) : null;
};

/** Read-only code; an empty `code` (expired, or none to show) draws placeholders. */
export function CodeDisplay({ code }: { code: string }) {
  const empty = code === '';
  return (
    <div className="code-groups" role="img" aria-label={empty ? 'No ReGBY code' : `ReGBY code ${code}`}>
      {GROUPS.map((group) => (
        <div key={group} className="code-group" style={barColor(group)}>
          <div className="code-box" data-empty={empty}>
            {groupOf(code, group)}
          </div>
        </div>
      ))}
    </div>
  );
}

interface CodeInputProps {
  value: string;
  onChange: (digits: string) => void;
  invalid: boolean;
  disabled: boolean;
}

/**
 * Four two-digit boxes over one digit string. Typing advances, Backspace on
 * an empty box steps back, and a paste anywhere fills from the first box.
 * Digits typed with no field focused land in the code too, so a hardware
 * keyboard needs no click first. Never autofocused: the on-screen keyboard
 * stays down until the customer taps a box, so it does not cover the screen.
 */
export function CodeInput({ value, onChange, invalid, disabled }: CodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const focus = (group: number) => refs.current[Math.max(0, Math.min(group, GROUP_COUNT - 1))]?.focus();
  // Read by the document listeners, which are bound once per enable.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  /** Sets the whole code and puts the caret where the next digit goes. A
   *  full code is left unfocused: it redeems at once and drops the keyboard. */
  const fill = (next: string) => {
    onChangeRef.current(next);
    if (next.length < REGBY_CODE_LENGTH) focus(Math.floor(next.length / REGBY_CODE_GROUP));
  };

  useEffect(() => {
    if (disabled) return;
    const onDocumentKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditable(event.target)) return;
      const current = valueRef.current;
      let next: string;
      if (/^\d$/.test(event.key)) {
        if (current.length >= REGBY_CODE_LENGTH) return;
        next = current + event.key;
      } else if (event.key === 'Backspace') {
        next = current.slice(0, -1);
      } else {
        return;
      }
      event.preventDefault();
      fill(next);
    };
    const onDocumentPaste = (event: globalThis.ClipboardEvent) => {
      if (isEditable(event.target)) return;
      const digits = pastedDigits(event.clipboardData?.getData('text') ?? '');
      if (digits === null) return;
      event.preventDefault();
      fill(digits);
    };
    document.addEventListener('keydown', onDocumentKey);
    document.addEventListener('paste', onDocumentPaste);
    return () => {
      document.removeEventListener('keydown', onDocumentKey);
      document.removeEventListener('paste', onDocumentPaste);
    };
    // `fill` reads only refs, so binding it once per enable is enough.
  }, [disabled]);

  const setGroup = (group: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, REGBY_CODE_GROUP);
    // Rebuild from the groups so editing a middle box never shifts the rest.
    const groups = GROUPS.map((g) => (g === group ? digits : groupOf(value, g)));
    const next = groups.join('').slice(0, REGBY_CODE_LENGTH);
    onChange(next);
    if (digits.length === REGBY_CODE_GROUP && group < GROUP_COUNT - 1) focus(group + 1);
  };

  const onKeyDown = (group: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && event.currentTarget.value === '' && group > 0) {
      event.preventDefault();
      focus(group - 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = pastedDigits(event.clipboardData.getData('text'));
    if (digits === null) return;
    event.preventDefault();
    fill(digits);
  };

  const pasteButton = async () => {
    const text = await readClipboard();
    setPasteBlocked(text === null);
    const digits = text === null ? null : pastedDigits(text);
    if (digits !== null) fill(digits);
  };

  return (
    <div className="code-input">
      <div className="code-groups" data-invalid={invalid}>
        {GROUPS.map((group) => (
          <div key={group} className="code-group" style={barColor(group)}>
            <input
              ref={(node) => {
                refs.current[group] = node;
              }}
              className="code-box"
              value={groupOf(value, group)}
              onChange={(event) => setGroup(group, event.target.value)}
              onKeyDown={(event) => onKeyDown(group, event)}
              onPaste={onPaste}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={REGBY_CODE_GROUP}
              // A blank placeholder only enables `:placeholder-shown`, which draws the empty-pair dashes.
              placeholder=" "
              disabled={disabled}
              aria-label={`Code digits ${group * REGBY_CODE_GROUP + 1} to ${(group + 1) * REGBY_CODE_GROUP}`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn code-paste"
        disabled={disabled}
        onClick={() => void pasteButton()}
      >
        <Clipboard size={ICON_SIZE} />
        Paste
      </button>
      {pasteBlocked && <p className="field-hint">{CLIPBOARD_BLOCKED_TEXT}</p>}
    </div>
  );
}
