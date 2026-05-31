import { useEffect } from "react";

type Options = {
  disabled?: boolean;
};

/**
 * Funnel global keystrokes into `setValue` — the user is on a controller so
 * an input field rarely has focus. We skip if another input/textarea is
 * already focused (so clicking the field still works as expected) or if
 * `disabled` is true (e.g., a modal is owning input).
 *
 *   - Printable keys append
 *   - Backspace pops the last char
 *
 * Escape is intentionally NOT handled here — it's the `back` action via the
 * keyboard adapter, and the scene's own `back` handler owns it.
 */
export function useGlobalTypeahead(
  setValue: (updater: (current: string) => string) => void,
  { disabled = false }: Options = {},
): void {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Backspace") {
        setValue((q) => q.slice(0, -1));
        e.preventDefault();
      } else if (e.key.length === 1) {
        setValue((q) => q + e.key);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, setValue]);
}
