import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/product-factory';
import { makeTestApp, TEST_WEB_ORIGIN } from '../test/test-app';

const { app } = makeTestApp([makeProduct({ id: '1' })]);

describe('CORS', () => {
  it('allows the configured web origin', async () => {
    const res = await request(app).get('/api/products/1').set('Origin', TEST_WEB_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(TEST_WEB_ORIGIN);
  });

  it('sends no CORS headers to other origins', async () => {
    const res = await request(app).get('/api/products/1').set('Origin', 'https://evil.test');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the JSON POST preflight for the enquiry form', async () => {
    const res = await request(app)
      .options('/api/enquiries')
      .set('Origin', TEST_WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(TEST_WEB_ORIGIN);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });
});

describe('helmet', () => {
  it('sets standard security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
