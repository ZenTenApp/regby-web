interface SwitchProps {
  label: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

/** Labelled on/off switch: a native checkbox with switch semantics, so
 *  keyboard and screen-reader behaviour come for free. Nested in its label,
 *  so the label needs no `htmlFor`. */
export function Switch({ label, checked, onChange, disabled = false }: SwitchProps) {
  return (
    <label className="switch">
      {label}
      <input
        type="checkbox"
        role="switch"
        className="switch-input"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );
}
