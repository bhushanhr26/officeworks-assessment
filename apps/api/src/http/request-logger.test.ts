import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeTestApp } from '../test/test-app';

describe('requestLogger', () => {
  it('assigns a request id, returns it, and logs one line without the query string', async () => {
    const { app, logger } = makeTestApp();
    const res = await request(app).get('/api/products?search=secret-term');

    const id = res.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(logger.info).toHaveBeenCalledOnce();
    const line = String(logger.info.mock.calls[0]?.[0]);
    expect(line).toMatch(new RegExp(`^GET /api/products 200 [0-9.]+ms id=${id}$`));
    expect(line).not.toContain('secret-term');
  });

  it('reuses a well-formed incoming X-Request-Id and replaces a malformed one', async () => {
    const { app } = makeTestApp();
    const good = await request(app).get('/health').set('X-Request-Id', 'lb-abc-123');
    const bad = await request(app).get('/health').set('X-Request-Id', '<script>injected</script>');

    expect(good.headers['x-request-id']).toBe('lb-abc-123');
    expect(bad.headers['x-request-id']).not.toContain('injected');
  });
});
