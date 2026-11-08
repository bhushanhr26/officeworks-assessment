import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, CategoryProductsSchema, CategorySchema } from '@catalogue/contracts';
import { UpstreamError } from '../domain/errors';
import { JEWELERY, makeProduct } from '../test/product-factory';
import { makeTestApp } from '../test/test-app';

const rated = (id: string, average: number) => makeProduct({ id, rating: { average, count: 1 } });
const products = [
  rated('1', 2),
  rated('2', 5),
  rated('3', 4),
  rated('4', 3),
  rated('5', 1),
  makeProduct({ id: '9', category: JEWELERY }),
];

describe('GET /api/categories', () => {
  it('returns {slug, name} for each category', async () => {
    const res = await request(makeTestApp(products).app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(CategorySchema.array().parse(res.body)).toEqual([
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'jewelery', name: 'Jewelery' },
    ]);
  });

  it('502 when the source is down', async () => {
    const { app, repository } = makeTestApp(products);
    repository.failWith = new UpstreamError('down');
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(502);
  });
});

describe('GET /api/categories/:slug/products', () => {
  it('returns top 3 rated and the others', async () => {
    const res = await request(makeTestApp(products).app).get(
      '/api/categories/electronics/products',
    );

    expect(res.status).toBe(200);
    const body = CategoryProductsSchema.parse(res.body);
    expect(body.topRated.map((p) => p.id)).toEqual(['2', '3', '4']);
    expect(body.others.map((p) => p.id)).toEqual(['1', '5']);
  });

  it('404 for an unknown category', async () => {
    const res = await request(makeTestApp(products).app).get('/api/categories/toys/products');
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('400 for a malformed slug', async () => {
    const res = await request(makeTestApp(products).app).get('/api/categories/Bad_Slug/products');
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });
});
