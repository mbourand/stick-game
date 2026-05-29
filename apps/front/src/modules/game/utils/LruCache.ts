/**
 * Bounded LRU cache. Read or set bumps an entry to the most-recently-used
 * position; setting past `capacity` evicts the least-recently-used entry,
 * passing the dropped value to `onEvict` so callers can release resources
 * (revoke blob URLs, dispose textures, etc.).
 */
export class LruCache<K, V> {
  private readonly capacity: number;
  private readonly onEvict?: (value: V, key: K) => void;
  private readonly map = new Map<K, V>();

  constructor(capacity: number, onEvict?: (value: V, key: K) => void) {
    if (capacity < 1) throw new Error("LruCache capacity must be >= 1");
    this.capacity = capacity;
    this.onEvict = onEvict;
  }

  public get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  public set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      const evicted = this.map.get(oldest) as V;
      this.map.delete(oldest);
      this.onEvict?.(evicted, oldest);
    }
  }

  public has(key: K): boolean {
    return this.map.has(key);
  }
}
