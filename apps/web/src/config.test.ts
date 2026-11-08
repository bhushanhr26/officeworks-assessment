import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('defaults to the local API and strips trailing slashes', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:3000');
    expect(resolveApiBaseUrl('https://api.shop.test/')).toBe('https://api.shop.test');
  });

  it('rejects an invalid URL', () => {
    expect(() => resolveApiBaseUrl('not a url')).toThrow(/VITE_API_URL/);
  });
});
