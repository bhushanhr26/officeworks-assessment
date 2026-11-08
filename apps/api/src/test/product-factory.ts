import type { Category, Product } from '@catalogue/contracts';

export const ELECTRONICS: Category = { slug: 'electronics', name: 'Electronics' };
export const JEWELERY: Category = { slug: 'jewelery', name: 'Jewelery' };

export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    title: `Product ${overrides.id}`,
    description: 'A product',
    price: 10,
    currency: 'AUD',
    category: ELECTRONICS,
    imageUrl: `https://img.test/${overrides.id}.png`,
    rating: { average: 3, count: 10 },
    ...overrides,
  };
}
