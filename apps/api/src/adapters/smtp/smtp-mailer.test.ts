import { describe, expect, it, vi } from 'vitest';
import { UpstreamError } from '../../domain/errors';
import { SmtpMailer, toTransportOptions } from './smtp-mailer';

const message = { to: 'sales@shop.test', subject: 'Hi', text: 'hello', html: '<p>hello</p>' };

describe('SmtpMailer', () => {
  it('sends with the configured from address', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    await new SmtpMailer('Shop <no-reply@shop.test>', { sendMail }).send(message);

    expect(sendMail).toHaveBeenCalledWith({ from: 'Shop <no-reply@shop.test>', ...message });
  });

  it('wraps transport failures in UpstreamError', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(new SmtpMailer('x@shop.test', { sendMail }).send(message)).rejects.toBeInstanceOf(
      UpstreamError,
    );
  });
});

describe('toTransportOptions', () => {
  const base = {
    host: 'smtp.test',
    port: 587,
    secure: false,
    requireTLS: true,
    from: 'x@shop.test',
  };

  it('passes TLS settings through and sets timeouts', () => {
    expect(toTransportOptions(base)).toMatchObject({
      host: 'smtp.test',
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
    });
  });

  it('only sends credentials when both user and pass are set', () => {
    expect(toTransportOptions(base).auth).toBeUndefined();
    expect(toTransportOptions({ ...base, user: 'u' }).auth).toBeUndefined();
    expect(toTransportOptions({ ...base, user: 'u', pass: 'p' }).auth).toEqual({
      user: 'u',
      pass: 'p',
    });
  });
});
