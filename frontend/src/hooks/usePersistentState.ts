import { useCallback, useState } from "react";

/**
 * useState backed by localStorage. Client-only presentation preferences
 * (view mode, etc.) — never anything that must round-trip to the server.
 */
export function usePersistentState<T extends string>(
  key: string,
  initial: T,
  isValid: (v: string) => v is T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null && isValid(stored)) return stored;
    } catch {
      /* private mode / disabled */
    }
    return initial;
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  return [value, set];
}
