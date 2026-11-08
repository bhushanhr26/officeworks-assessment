import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiErrorSchema } from '@catalogue/contracts';
import { UpstreamError } from '../domain/errors';
import { makeProduct } from '../test/product-factory';
import { makeTestApp, TEST_SALES_INBOX } from '../test/test-app';

const products = [makeProduct({ id: '7', title: 'Gold Ring' })];
const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+61 400 000 000',
  message: 'Is this available in size 7?',
  productId: '7',
  website: '',
};

const post = (app: ReturnType<typeof makeTestApp>['app'], body: unknown) =>
  request(app)
    .post('/api/enquiries')
    .send(body as object);
const errorCode = (body: unknown) => ApiErrorSchema.parse(body).error.code;

describe('POST /api/enquiries', () => {
  it('202 and sends one email to the sales inbox with the product title', async () => {
    const { app, mailer } = makeTestApp(products);

    const res = await post(app, valid);

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });
    expect(mailer.sent).toHaveLength(1);
    const [email] = mailer.sent;
    expect(email?.to).toBe(TEST_SALES_INBOX);
    expect(email?.subject).toContain('Gold Ring');
    expect(email?.html).toContain('Gold Ring');
    expect(email?.replyTo).toBe('ada@example.com');
  });

  it('HTML-escapes user input in the email', async () => {
    const { app, mailer } = makeTestApp(products);

    await post(app, { ...valid, message: '<script>alert(1)</script>' });

    expect(mailer.sent[0]?.html).not.toContain('<script>');
    expect(mailer.sent[0]?.html).toContain('&lt;script&gt;');
  });

  it.each([
    ['missing fields', {}],
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['blank message', { ...valid, message: '   ' }],
    ['invalid phone', { ...valid, phone: 'call me maybe' }],
    ['malformed productId', { ...valid, productId: '../7' }],
  ])('400 for %s and sends nothing', async (_label, body) => {
    const { app, mailer } = makeTestApp(products);

    const res = await post(app, body);

    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('VALIDATION_ERROR');
    expect(mailer.sent).toHaveLength(0);
  });

  it('400 for malformed JSON', async () => {
    const { app } = makeTestApp(products);
    const res = await request(app)
      .post('/api/enquiries')
      .set('content-type', 'application/json')
      .send('{"name":');
    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('VALIDATION_ERROR');
  });

  it('400 for a body over 10kb', async () => {
    const { app, mailer } = makeTestApp(products);
    const res = await post(app, { ...valid, message: 'x'.repeat(11 * 1024) });
    expect(res.status).toBe(400);
    expect(mailer.sent).toHaveLength(0);
  });

  it('honeypot: 202 like a real submission, but sends nothing', async () => {
    const { app, mailer } = makeTestApp(products);

    const res = await post(app, { ...valid, website: 'https://spam.test' });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ status: 'accepted' });
    expect(mailer.sent).toHaveLength(0);
  });

  it('404 for an unknown product and sends nothing', async () => {
    const { app, mailer } = makeTestApp(products);

    const res = await post(app, { ...valid, productId: '999' });

    expect(res.status).toBe(404);
    expect(errorCode(res.body)).toBe('NOT_FOUND');
    expect(mailer.sent).toHaveLength(0);
  });

  it('502 when the mailer fails, without leaking details', async () => {
    const { app, mailer, logger } = makeTestApp(products);
    mailer.failWith = new UpstreamError('SMTP send failed: smtp.internal:25');

    const res = await post(app, valid);

    expect(res.status).toBe(502);
    expect(errorCode(res.body)).toBe('UPSTREAM_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('smtp.internal');
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('502 when the product source is down', async () => {
    const { app, repository } = makeTestApp(products);
    repository.failWith = new UpstreamError('down');
    expect((await post(app, valid)).status).toBe(502);
  });

  it('429 once the rate limit is exceeded, counting honeypot hits too', async () => {
    const { app, mailer } = makeTestApp(products, { rateLimitMax: 2 });

    expect((await post(app, valid)).status).toBe(202);
    expect((await post(app, { ...valid, website: 'bot' })).status).toBe(202);
    const res = await post(app, valid);

    expect(res.status).toBe(429);
    expect(errorCode(res.body)).toBe('RATE_LIMITED');
    expect(res.headers['ratelimit-policy']).toBeDefined();
    expect(mailer.sent).toHaveLength(1);
  });
});
