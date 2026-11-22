import { useCallback, useState } from 'react';

/** Busy and error state around one async action, so each screen does not
 *  re-implement the same try/catch/finally. `toError` turns a failure into
 *  what the screen shows: usually the user-facing message, or a reason when
 *  the screen draws each failure its own way. */
export function useAction<A extends unknown[], E = string>(
  action: (...args: A) => Promise<void>,
  toError: (err: unknown) => E,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<E | null>(null);

  const run = useCallback(
    async (...args: A) => {
      setError(null);
      setBusy(true);
      try {
        await action(...args);
      } catch (err) {
        setError(toError(err));
      } finally {
        setBusy(false);
      }
    },
    [action, toError],
  );

  return { run, busy, error, setError };
}
