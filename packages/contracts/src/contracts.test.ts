import { describe, expect, it } from 'vitest';
import {
  ApiErrorSchema,
  CategorySlugSchema,
  EnquiryRequestSchema,
  ProductIdSchema,
  ProductSchema,
  SearchQuerySchema,
} from './index';

const product = {
  id: '1',
  title: 'Backpack',
  description: 'Fits a laptop',
  price: 109.95,
  currency: 'AUD',
  category: { slug: 'mens-clothing', name: "men's clothing" },
  imageUrl: 'https://example.com/1.jpg',
  rating: { average: 3.9, count: 120 },
};

const enquiry = {
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Is this in stock?',
  productId: '1',
};

describe('ProductSchema', () => {
  it('accepts a valid product', () => {
    expect(ProductSchema.parse(product)).toEqual(product);
  });

  it('only accepts https image URLs', () => {
    for (const imageUrl of [
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'http://x.test/a.png',
      'nope',
    ]) {
      expect(ProductSchema.safeParse({ ...product, imageUrl }).success).toBe(false);
    }
  });

  it('rejects a rating above 5 and a non-AUD currency', () => {
    expect(ProductSchema.safeParse({ ...product, rating: { average: 6, count: 1 } }).success).toBe(
      false,
    );
    expect(ProductSchema.safeParse({ ...product, currency: 'USD' }).success).toBe(false);
  });
});

describe('ProductIdSchema', () => {
  it('accepts opaque url-safe ids and rejects anything else', () => {
    expect(ProductIdSchema.parse('7')).toBe('7');
    expect(ProductIdSchema.parse('SKU-123_a')).toBe('SKU-123_a');
    expect(ProductIdSchema.safeParse('').success).toBe(false);
    expect(ProductIdSchema.safeParse('../etc').success).toBe(false);
    expect(ProductIdSchema.safeParse('a b').success).toBe(false);
    expect(ProductIdSchema.safeParse('x'.repeat(65)).success).toBe(false);
    expect(ProductIdSchema.safeParse(7).success).toBe(false);
  });
});

describe('CategorySlugSchema', () => {
  it('accepts kebab-case and rejects anything else', () => {
    expect(CategorySlugSchema.safeParse('mens-clothing').success).toBe(true);
    expect(CategorySlugSchema.safeParse("men's clothing").success).toBe(false);
    expect(CategorySlugSchema.safeParse('../etc').success).toBe(false);
  });
});

describe('SearchQuerySchema', () => {
  it('trims the term and rejects empty or whitespace', () => {
    expect(SearchQuerySchema.parse({ search: '  bag ' })).toEqual({ search: 'bag' });
    expect(SearchQuerySchema.safeParse({ search: '   ' }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe('EnquiryRequestSchema', () => {
  it('accepts a minimal enquiry and defaults the honeypot to empty', () => {
    expect(EnquiryRequestSchema.parse(enquiry)).toEqual({ ...enquiry, website: '' });
  });

  it('accepts an empty or valid phone, rejects a bad one', () => {
    expect(EnquiryRequestSchema.safeParse({ ...enquiry, phone: '' }).success).toBe(true);
    expect(EnquiryRequestSchema.safeParse({ ...enquiry, phone: '+61 400 000 000' }).success).toBe(
      true,
    );
    expect(EnquiryRequestSchema.safeParse({ ...enquiry, phone: 'call me' }).success).toBe(false);
  });

  it('rejects missing name, bad email and blank message', () => {
    expect(EnquiryRequestSchema.safeParse({ ...enquiry, name: ' ' }).success).toBe(false);
    expect(EnquiryRequestSchema.safeParse({ ...enquiry, email: 'nope' }).success).toBe(false);
    expect(EnquiryRequestSchema.safeParse({ ...enquiry, message: '' }).success).toBe(false);
  });
});

describe('ApiErrorSchema', () => {
  it('only allows known error codes', () => {
    expect(ApiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'x' } }).success).toBe(
      true,
    );
    expect(ApiErrorSchema.safeParse({ error: { code: 'TEAPOT', message: 'x' } }).success).toBe(
      false,
    );
  });
});
