type Listener = () => void;

/**
 * Observable cell of state. Writes that don't change the value (by Object.is)
 * are dropped; otherwise listeners are notified synchronously. Methods are
 * bound to the instance so they can be passed straight to useSyncExternalStore.
 */
export class Store<T> {
  private value: T;
  private readonly listeners = new Set<Listener>();

  constructor(initial: T) {
    this.value = initial;
  }

  public get = (): T => this.value;

  public set = (next: T): void => {
    if (Object.is(next, this.value)) return;
    this.value = next;
    for (const listener of this.listeners) listener();
  };

  public update = (fn: (prev: T) => T): void => {
    this.set(fn(this.value));
  };

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
