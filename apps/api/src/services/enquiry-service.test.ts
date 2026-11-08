import { ZodError } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryProductRepository } from '../adapters/in-memory/in-memory-product-repository';
import { NotFoundError, UpstreamError } from '../domain/errors';
import { FakeMailer } from '../test/fake-mailer';
import { makeProduct } from '../test/product-factory';
import { EnquiryService } from './enquiry-service';

const valid = { name: 'Ada', email: 'ada@example.com', message: 'In stock?', productId: '7' };

function setup() {
  const repository = new InMemoryProductRepository([makeProduct({ id: '7', title: 'Gold Ring' })]);
  const mailer = new FakeMailer();
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  const service = new EnquiryService(repository, mailer, 'sales@shop.test', logger);
  return { service, mailer, repository, logger };
}

describe('EnquiryService.submit', () => {
  it('sends one email to the sales inbox', async () => {
    const { service, mailer } = setup();

    expect(await service.submit(valid)).toBe('sent');
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({
      to: 'sales@shop.test',
      subject: 'New enquiry: Gold Ring',
    });
  });

  it.each([['spam'], [1], [true]])('drops honeypot submissions (website=%s)', async (website) => {
    const { service, mailer, logger } = setup();

    expect(await service.submit({ ...valid, website })).toBe('dropped');
    expect(mailer.sent).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('drops honeypot submissions even when the rest is invalid', async () => {
    const { service, mailer } = setup();
    expect(await service.submit({ website: 'x' })).toBe('dropped');
    expect(mailer.sent).toHaveLength(0);
  });

  it('rejects invalid input with a ZodError', async () => {
    const { service } = setup();
    await expect(service.submit({ ...valid, email: 'nope' })).rejects.toBeInstanceOf(ZodError);
    await expect(service.submit(null)).rejects.toBeInstanceOf(ZodError);
  });

  it('throws NotFoundError for an unknown product and sends nothing', async () => {
    const { service, mailer } = setup();
    await expect(service.submit({ ...valid, productId: '999' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(mailer.sent).toHaveLength(0);
  });

  it('turns any mailer failure into UpstreamError', async () => {
    const { service, mailer } = setup();
    mailer.failWith = new Error('ECONNREFUSED');
    await expect(service.submit(valid)).rejects.toBeInstanceOf(UpstreamError);
  });
});
