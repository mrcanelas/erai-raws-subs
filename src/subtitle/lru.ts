/**
 * Tiny in-memory LRU for decompressed ASS buffers.
 * Disposable — Postgres remains the source of truth.
 */
export class LruCache<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly maxEntries: number) {
    if (maxEntries < 1) {
      throw new Error("LruCache maxEntries must be >= 1");
    }
  }

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) {
      return undefined;
    }
    // Refresh insertion order (most-recently used at the end).
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
