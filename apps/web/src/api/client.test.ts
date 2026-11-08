import { describe, expect, it, vi } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { ApiRequestError, createApiClient } from './client';

const BASE = 'http://api.test';

function respond(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

async function catchError(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(error instanceof ApiRequestError)) throw new Error('Expected ApiRequestError');
  return error;
}

describe('createApiClient', () => {
  it('calls OUR API and parses the response with the contract schema', async () => {
    const product = makeProduct({ id: '1' });
    const fetchFn = respond(product);

    expect(await createApiClient(BASE, fetchFn).getProduct('1')).toEqual(product);
    expect(fetchFn).toHaveBeenCalledWith(`${BASE}/api/products/1`, expect.any(Object));
  });

  it('URL-encodes search terms and path segments', async () => {
    const fetchFn = respond([]);
    const api = createApiClient(BASE, fetchFn);

    await api.searchProducts('rings & things?');
    await api.getProduct('a/b').catch(() => undefined);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`${BASE}/api/products?search=rings%20%26%20things%3F`);
    expect(fetchFn.mock.calls[1]?.[0]).toBe(`${BASE}/api/products/a%2Fb`);
  });

  it('maps API error bodies to ApiRequestError with code and status', async () => {
    const fetchFn = respond(
      { error: { code: 'NOT_FOUND', message: 'Product "9" not found' } },
      404,
    );
    const error = await catchError(createApiClient(BASE, fetchFn).getProduct('9'));

    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await catchError(createApiClient(BASE, fetchFn).getCategories());
    expect(error.code).toBe('NETWORK_ERROR');
  });

  it('rejects responses that do not match the contract', async () => {
    const error = await catchError(
      createApiClient(BASE, respond([{ id: 1 }])).getFeaturedProducts(),
    );
    expect(error.code).toBe('INVALID_RESPONSE');
  });

  it('rejects non-JSON error responses', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<html>', { status: 502 }));
    const error = await catchError(createApiClient(BASE, fetchFn).getCategories());
    expect(error).toMatchObject({ code: 'INVALID_RESPONSE', status: 502 });
  });

  it('POSTs enquiries as JSON', async () => {
    const fetchFn = respond({ status: 'accepted' }, 202);
    const enquiry = { name: 'Ada', email: 'a@b.test', message: 'Hi', productId: '1', website: '' };

    expect(await createApiClient(BASE, fetchFn).submitEnquiry(enquiry)).toEqual({
      status: 'accepted',
    });
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/api/enquiries`);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual(enquiry);
  });
});
