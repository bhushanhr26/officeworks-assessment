/**
 * Single-value in-memory cache with a TTL.
 * Concurrent misses share one in-flight load; a failed load is not cached.
 */
export class TtlCache<T> {
  private entry: { value: T; expiresAt: number } | undefined;
  private inFlight: Promise<T> | undefined;

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(load: () => Promise<T>): Promise<T> {
    if (this.entry && this.now() < this.entry.expiresAt) {
      return Promise.resolve(this.entry.value);
    }
    if (!this.inFlight) {
      this.inFlight = load()
        .then((value) => {
          this.entry = { value, expiresAt: this.now() + this.ttlMs };
          return value;
        })
        .finally(() => {
          this.inFlight = undefined;
        });
    }
    return this.inFlight;
  }
}
