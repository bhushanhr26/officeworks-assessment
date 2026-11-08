import { describe, expect, it, vi } from 'vitest';
import { UpstreamError } from '../../domain/errors';
import fixture from './__fixtures__/fakestore-products.json';
import { FakeStoreProductRepository } from './fakestore-product-repository';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

function makeRepo(
  fetchFn: typeof fetch,
  now: () => number = () => 0,
  { logger = silentLogger(), timeoutMs = 1000 } = {},
) {
  return new FakeStoreProductRepository({
    baseUrl: 'https://upstream.test/',
    timeoutMs,
    cacheTtlMs: 60_000,
    logger,
    fetchFn,
    now,
  });
}

/** A fetch that never answers, but rejects like real fetch when its signal aborts. */
const hangingFetch: typeof fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

describe('FakeStoreProductRepository', () => {
  it('fetches /products and maps to our model', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fixture));
    const products = await makeRepo(fetchFn).getAll();

    expect(fetchFn).toHaveBeenCalledWith('https://upstream.test/products', expect.any(Object));
    expect(products.map((p) => p.id)).toEqual(['1', '5', '18']);
  });

  it('caches within the TTL and refetches after it', async () => {
    let now = 0;
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse(fixture));
    const repo = makeRepo(fetchFn, () => now);

    await repo.getAll();
    await repo.getById('5');
    await repo.getCategories();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    now = 60_000;
    await repo.getAll();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('getById returns null for unknown ids', async () => {
    const repo = makeRepo(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fixture)));
    expect(await repo.getById('999')).toBeNull();
  });

  it('getCategories returns unique categories sorted by name', async () => {
    const repo = makeRepo(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fixture)));
    expect(await repo.getCategories()).toEqual([
      { slug: 'jewelery', name: 'Jewelery' },
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'womens-clothing', name: "Women's Clothing" },
    ]);
  });

  it.each([
    ['network failure or timeout', () => Promise.reject(new TypeError('fetch failed'))],
    ['non-2xx status', async () => jsonResponse({ message: 'down' }, 503)],
    ['invalid JSON', async () => new Response('<html>', { status: 200 })],
    ['a body that is not a list', async () => jsonResponse({ products: [] })],
    ['a list where no record is valid', async () => jsonResponse([{ id: 'x' }])],
  ])('throws UpstreamError on %s', async (_label, impl) => {
    const repo = makeRepo(vi.fn<typeof fetch>().mockImplementation(impl));
    await expect(repo.getAll()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('times out a slow upstream with UpstreamError', async () => {
    const repo = makeRepo(hangingFetch, () => 0, { timeoutMs: 20 });
    const started = Date.now();

    await expect(repo.getAll()).rejects.toBeInstanceOf(UpstreamError);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('skips and logs invalid records but keeps the valid ones', async () => {
    const logger = silentLogger();
    const body = [fixture[0], { id: 99, title: 'broken' }, fixture[1]];
    const repo = makeRepo(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body)), () => 0, {
      logger,
    });

    expect((await repo.getAll()).map((p) => p.id)).toEqual(['1', '5']);
    expect(logger.warn).toHaveBeenCalledWith('Skipped invalid Fake Store product at index 1');
  });

  it('treats an empty list as an empty catalogue, not an error', async () => {
    const repo = makeRepo(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([])));
    expect(await repo.getAll()).toEqual([]);
  });

  it('does not cache failures', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(fixture));
    const repo = makeRepo(fetchFn);

    await expect(repo.getAll()).rejects.toBeInstanceOf(UpstreamError);
    expect(await repo.getAll()).toHaveLength(3);
  });
});
