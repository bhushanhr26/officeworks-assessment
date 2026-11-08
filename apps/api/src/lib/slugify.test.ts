import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it.each([
    ["men's clothing", 'mens-clothing'],
    ["Women's Clothing", 'womens-clothing'],
    ['electronics', 'electronics'],
    ['  Home & Garden  ', 'home-garden'],
    ['Café Crème', 'cafe-creme'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
