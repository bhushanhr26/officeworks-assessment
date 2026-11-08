import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, loadDotEnv } from './config';

const required = { SALES_INBOX: 'sales@shop.test', MAIL_FROM: 'Shop <no-reply@shop.test>' };

describe('loadConfig', () => {
  it('applies defaults (Mailpit on localhost)', () => {
    expect(loadConfig(required)).toEqual({
      ...required,
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:5173'],
      TRUST_PROXY_HOPS: 0,
      UPSTREAM_TIMEOUT_MS: 5000,
      PRODUCT_CACHE_TTL_MS: 300_000,
      FEATURED_CONFIG_PATH: 'config/featured.json',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SMTP_REQUIRE_TLS: false,
      ENQUIRY_RATE_LIMIT_MAX: 5,
      ENQUIRY_RATE_LIMIT_WINDOW_MS: 900_000,
    });
  });

  it('parses a comma-separated CORS allowlist', () => {
    expect(
      loadConfig({ ...required, CORS_ORIGINS: 'http://a.test, https://b.test' }).CORS_ORIGINS,
    ).toEqual(['http://a.test', 'https://b.test']);
    expect(() => loadConfig({ ...required, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
  });

  it('requires the sales inbox and from address', () => {
    expect(() => loadConfig({})).toThrow(/SALES_INBOX/);
    expect(() => loadConfig({ ...required, SALES_INBOX: 'nope' })).toThrow(/SALES_INBOX/);
    expect(() => loadConfig({ SALES_INBOX: 'a@b.test' })).toThrow(/MAIL_FROM/);
  });

  it('parses SMTP_SECURE strictly', () => {
    expect(loadConfig({ ...required, SMTP_SECURE: 'true' }).SMTP_SECURE).toBe(true);
    expect(() => loadConfig({ ...required, SMTP_SECURE: 'yes' })).toThrow(/SMTP_SECURE/);
  });

  it('treats empty optional values as unset (as copied from .env.example)', () => {
    const config = loadConfig({
      ...required,
      SMTP_USER: '',
      SMTP_PASS: '',
      FAKESTORE_BASE_URL: '',
    });
    expect(config.SMTP_USER).toBeUndefined();
    expect(config.FAKESTORE_BASE_URL).toBeUndefined();
  });

  it('requires SMTP_USER and SMTP_PASS together', () => {
    expect(() => loadConfig({ ...required, SMTP_USER: 'u' })).toThrow(/SMTP_USER and SMTP_PASS/);
    expect(loadConfig({ ...required, SMTP_USER: 'u', SMTP_PASS: 'p' }).SMTP_USER).toBe('u');
  });

  it('coerces numbers and fails fast on invalid values', () => {
    expect(loadConfig({ ...required, PORT: '4000' }).PORT).toBe(4000);
    expect(() => loadConfig({ ...required, PORT: 'abc' })).toThrow(/Invalid configuration: PORT/);
    expect(() => loadConfig({ ...required, FAKESTORE_BASE_URL: 'x' })).toThrow(
      /FAKESTORE_BASE_URL/,
    );
    expect(() => loadConfig({ ...required, UPSTREAM_TIMEOUT_MS: '0' })).toThrow(
      /UPSTREAM_TIMEOUT_MS/,
    );
  });
});

describe('loadDotEnv', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dotenv-'));
  afterEach(() => {
    delete process.env.CATALOGUE_TEST_VAR;
  });

  it('loads variables from the file', () => {
    const path = join(dir, '.env');
    writeFileSync(path, 'CATALOGUE_TEST_VAR=from-file\n');
    loadDotEnv(path);
    expect(process.env.CATALOGUE_TEST_VAR).toBe('from-file');
  });

  it('is a no-op when the file does not exist', () => {
    expect(() => loadDotEnv(join(dir, 'missing.env'))).not.toThrow();
  });

  it('still fails on other errors (e.g. the path is a directory)', () => {
    expect(() => loadDotEnv(dir)).toThrow();
  });
});
