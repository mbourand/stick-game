type Handler = () => void;

/**
 * A minimal keyed multi-subscriber registry: each key maps to a set of
 * zero-arg handlers. `add` returns a disposer that removes just that
 * subscription. `emit` fans out to every handler for a key.
 *
 * Extracted because the input layer hand-rolled this exact `Map<K, Set<fn>>`
 * shape three times over (InputSystem's action handlers, the keyboard
 * adapter's per-key handlers, the gamepad's per-button handlers).
 */
export class HandlerRegistry<K> {
  private readonly handlers = new Map<K, Set<Handler>>();

  /** Subscribe `handler` to `key`. Returns a disposer that removes it. */
  public add(key: K, handler: Handler): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  /**
   * Invoke every handler registered for `key`. Iterates a snapshot so a
   * handler may add/remove subscriptions mid-dispatch without skipping or
   * double-firing. Returns true if at least one handler ran — callers (e.g.
   * the keyboard adapter deciding whether to `preventDefault`) use this to
   * tell "a binding consumed the event" from "nobody was listening".
   */
  public emit(key: K): boolean {
    const set = this.handlers.get(key);
    if (!set || set.size === 0) return false;
    for (const handler of [...set]) handler();
    return true;
  }

  /** Drop every subscription. */
  public clear(): void {
    this.handlers.clear();
  }
}
