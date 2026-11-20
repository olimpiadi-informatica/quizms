import { useCallback, useSyncExternalStore } from "react";

// Variant selected in `quizms dev` for each problem folder. It lives outside the components so
// that it is shared by all translations of a problem and survives a language switch (which
// replaces the problem component with its translation).
const selected = new Map<string, number>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Dev-only: the variant shown for the problem in folder `problem`. Injected by `recma-variants`. */
export function useDevVariant(problem: string): [number, (variant: number) => void] {
  const variant = useSyncExternalStore(
    subscribe,
    () => selected.get(problem) ?? 0,
    () => 0,
  );
  const setVariant = useCallback(
    (variant: number) => {
      selected.set(problem, variant);
      for (const listener of listeners) listener();
    },
    [problem],
  );
  return [variant, setVariant];
}
