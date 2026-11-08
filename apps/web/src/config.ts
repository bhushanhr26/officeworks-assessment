const DEFAULT_API_URL = 'http://localhost:3000';

/**
 * Validates VITE_API_URL (our API, never a third-party source) and strips trailing slashes.
 * Uses `new URL` rather than `URL.canParse`, which older Safari (<17) lacks.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim() || DEFAULT_API_URL;
  try {
    new URL(value);
  } catch (cause) {
    throw new Error(`Invalid VITE_API_URL: "${value}"`, { cause });
  }
  return value.replace(/\/+$/, '');
}
