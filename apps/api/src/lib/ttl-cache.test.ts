import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('serves the cached value until the TTL expires', async () => {
    let now = 0;
    const cache = new TtlCache<number>(1000, () => now);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    expect(await cache.get(load)).toBe(1);
    now = 999;
    expect(await cache.get(load)).toBe(1);
    now = 1000;
    expect(await cache.get(load)).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const cache = new TtlCache<string>(1000);
    const load = vi.fn().mockResolvedValue('v');

    const results = await Promise.all([cache.get(load), cache.get(load), cache.get(load)]);

    expect(results).toEqual(['v', 'v', 'v']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = new TtlCache<string>(1000);
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');

    await expect(cache.get(load)).rejects.toThrow('boom');
    expect(await cache.get(load)).toBe('ok');
  });
});
