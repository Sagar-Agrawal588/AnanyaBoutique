const DEFAULT_TTL_SECONDS = 60;

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  _now() {
    return Date.now();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < this._now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const expiresAt = ttlSeconds ? this._now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  del(key) {
    this.store.delete(key);
  }

  delPrefix(prefix) {
    if (!prefix) return;
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  async wrap(key, ttlSeconds, fn) {
    const existing = this.get(key);
    if (existing !== null && existing !== undefined) return existing;
    const value = await fn();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

const cache = new MemoryCache();
export default cache;
