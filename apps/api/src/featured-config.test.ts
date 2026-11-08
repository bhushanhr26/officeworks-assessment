import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import shipped from '../config/featured.json';
import { loadFeaturedProductIds, parseFeaturedConfig } from './featured-config';

describe('parseFeaturedConfig', () => {
  it('accepts the shipped config', () => {
    expect(parseFeaturedConfig(shipped)).toHaveLength(5);
  });

  it('requires exactly 5 ids', () => {
    expect(() => parseFeaturedConfig({ productIds: ['1', '2'] })).toThrow(/Exactly 5/);
  });

  it('rejects duplicates and invalid ids', () => {
    expect(() => parseFeaturedConfig({ productIds: ['1', '1', '2', '3', '4'] })).toThrow(/unique/);
    expect(() => parseFeaturedConfig({ productIds: ['1', '2', '3', '4', '../x'] })).toThrow();
  });
});

describe('loadFeaturedProductIds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'featured-'));

  it('reads and validates a file', () => {
    const path = join(dir, 'ok.json');
    writeFileSync(path, JSON.stringify({ productIds: ['1', '2', '3', '4', '5'] }));
    expect(loadFeaturedProductIds(path)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('fails clearly for a missing file or invalid JSON', () => {
    expect(() => loadFeaturedProductIds(join(dir, 'missing.json'))).toThrow(
      /Could not read featured config/,
    );
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, '{not json');
    expect(() => loadFeaturedProductIds(bad)).toThrow(/Could not read featured config/);
  });
});
