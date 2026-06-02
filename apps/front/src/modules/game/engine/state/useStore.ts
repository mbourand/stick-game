import { useSyncExternalStore } from "react";
import type { ReadableStore } from "./Store";

export function useStore<T>(store: ReadableStore<T>): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.get(),
    () => store.get(),
  );
}
