import { z } from 'zod';
import { CategorySchema } from './category';

// Opaque string id: lets the data source change (numeric ids today, SKUs/UUIDs later)
// without changing the contract.
export const ProductIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid product id');

export const ProductSchema = z.object({
  id: ProductIdSchema,
  title: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
  currency: z.literal('AUD'),
  category: CategorySchema,
  // https only: blocks javascript:/data: URLs and mixed content from any future source.
  imageUrl: z.url({ protocol: /^https$/, error: 'Image URL must use https' }),
  rating: z.object({
    average: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
});

export const CategoryProductsSchema = z.object({
  topRated: z.array(ProductSchema),
  others: z.array(ProductSchema),
});

export const SearchQuerySchema = z.object({
  search: z.string().trim().min(1, 'Search term is required').max(100),
});

export type Product = z.infer<typeof ProductSchema>;
export type CategoryProducts = z.infer<typeof CategoryProductsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
