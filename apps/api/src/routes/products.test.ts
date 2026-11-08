import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, ProductSchema } from '@catalogue/contracts';
import { UpstreamError } from '../domain/errors';
import { makeProduct } from '../test/product-factory';
import { makeTestApp } from '../test/test-app';

const products = [
  makeProduct({ id: '1', title: 'Gaming Drive' }),
  makeProduct({ id: '2', title: 'Gold Ring' }),
  makeProduct({ id: '3', title: 'Backpack' }),
];

const errorCode = (body: unknown) => ApiErrorSchema.parse(body).error.code;

describe('GET /api/products/featured', () => {
  it('returns the configured products in order', async () => {
    const { app } = makeTestApp(products, { featuredProductIds: ['3', '1'] });
    const res = await request(app).get('/api/products/featured');

    expect(res.status).toBe(200);
    expect(
      ProductSchema.array()
        .parse(res.body)
        .map((p) => p.id),
    ).toEqual(['3', '1']);
  });
});

describe('GET /api/products?search=', () => {
  it('returns only matching products', async () => {
    const res = await request(makeTestApp(products).app).get('/api/products?search=GOLD');

    expect(res.status).toBe(200);
    expect(res.body.map((p: { id: string }) => p.id)).toEqual(['2']);
  });

  it('returns 200 with [] when nothing matches', async () => {
    const res = await request(makeTestApp(products).app).get('/api/products?search=teapot');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([['/api/products'], ['/api/products?search='], ['/api/products?search=%20%20']])(
    '400 for a missing or blank term: %s',
    async (url) => {
      const res = await request(makeTestApp(products).app).get(url);
      expect(res.status).toBe(400);
      expect(errorCode(res.body)).toBe('VALIDATION_ERROR');
    },
  );

  it('400 for a term over 100 characters', async () => {
    const res = await request(makeTestApp(products).app).get(
      `/api/products?search=${'a'.repeat(101)}`,
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product', async () => {
    const res = await request(makeTestApp(products).app).get('/api/products/2');
    expect(res.status).toBe(200);
    expect(ProductSchema.parse(res.body).title).toBe('Gold Ring');
  });

  it('404 for an unknown id', async () => {
    const res = await request(makeTestApp(products).app).get('/api/products/999');
    expect(res.status).toBe(404);
    expect(errorCode(res.body)).toBe('NOT_FOUND');
  });

  it('400 for a malformed id', async () => {
    const res = await request(makeTestApp(products).app).get('/api/products/bad%20id');
    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('VALIDATION_ERROR');
  });
});

describe('upstream failure', () => {
  it.each([['/api/products/featured'], ['/api/products?search=drive'], ['/api/products/1']])(
    '502 with a generic message and logs the cause: %s',
    async (url) => {
      const { app, repository, logger } = makeTestApp(products, { featuredProductIds: ['1'] });
      repository.failWith = new UpstreamError('Fake Store responded 503: secret-internal-url');

      const res = await request(app).get(url);

      expect(res.status).toBe(502);
      expect(errorCode(res.body)).toBe('UPSTREAM_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('secret-internal-url');
      expect(logger.error).toHaveBeenCalledOnce();
    },
  );
});

describe('unexpected errors', () => {
  it('500 without leaking the error message', async () => {
    const { app, repository } = makeTestApp(products);
    repository.failWith = new Error('db password is hunter2');

    const res = await request(app).get('/api/products/1');

    expect(res.status).toBe(500);
    expect(errorCode(res.body)).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});
