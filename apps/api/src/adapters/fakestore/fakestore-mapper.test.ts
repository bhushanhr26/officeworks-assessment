import { ZodError } from 'zod';
import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/fakestore-products.json';
import { toCategory, toProduct } from './fakestore-mapper';
import { FakeStoreProductListSchema } from './fakestore-schemas';

const [backpack, bracelet, top] = FakeStoreProductListSchema.parse(fixture);

describe('toProduct', () => {
  it('maps a Fake Store product into our Product model', () => {
    expect(toProduct(backpack!)).toEqual({
      id: '1',
      title: 'Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops',
      description: 'Your perfect pack for everyday use and walks in the forest.',
      price: 109.95,
      currency: 'AUD',
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      imageUrl: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg',
      rating: { average: 3.9, count: 120 },
    });
  });

  it('converts numeric ids to strings and trims text', () => {
    const product = toProduct(top!);
    expect(product.id).toBe('18');
    expect(product.title).toBe("MBJ Women's Solid Short Sleeve Boat Neck V");
  });

  it('maps every fixture record to a distinct category slug', () => {
    const slugs = [backpack!, bracelet!, top!].map((p) => toProduct(p).category.slug);
    expect(slugs).toEqual(['mens-clothing', 'jewelery', 'womens-clothing']);
  });

  it('rejects records that break our contract', () => {
    expect(() => toProduct({ ...backpack!, image: 'not-a-url' })).toThrow(ZodError);
    expect(() => toProduct({ ...backpack!, rating: { rate: 7, count: 1 } })).toThrow(ZodError);
    expect(() => toProduct({ ...backpack!, price: -1 })).toThrow(ZodError);
  });
});

describe('toCategory', () => {
  it('derives a slug and a display name', () => {
    expect(toCategory("women's clothing")).toEqual({
      slug: 'womens-clothing',
      name: "Women's Clothing",
    });
  });
});
