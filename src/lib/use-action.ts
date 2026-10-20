import { useCallback, useState } from 'react';

/** Busy and error state around one async action, so each screen does not
 *  re-implement the same try/catch/finally. `toText` turns a failure into
 *  the user-facing message. */
export function useAction<A extends unknown[]>(
  action: (...args: A) => Promise<void>,
  toText: (err: unknown) => string,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: A) => {
      setError(null);
      setBusy(true);
      try {
        await action(...args);
      } catch (err) {
        setError(toText(err));
      } finally {
        setBusy(false);
      }
    },
    [action, toText],
  );

  return { run, busy, error, setError };
}
