import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, HealthResponseSchema } from '@catalogue/contracts';
import { makeTestApp } from './test/test-app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(makeTestApp().app).get('/health');
    expect(res.status).toBe(200);
    expect(HealthResponseSchema.parse(res.body)).toEqual({ status: 'ok' });
  });

  it('does not advertise Express', async () => {
    const res = await request(makeTestApp().app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('unknown routes', () => {
  it('return 404 in the API error shape', async () => {
    const res = await request(makeTestApp().app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });
});
