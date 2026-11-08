import { z } from 'zod';

// Shape of the Fake Store API response. Never exported outside this adapter folder.
export const FakeStoreProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.string(),
  rating: z.object({
    rate: z.number(),
    count: z.number().int(),
  }),
});

export const FakeStoreProductListSchema = z.array(FakeStoreProductSchema);

export type FakeStoreProduct = z.infer<typeof FakeStoreProductSchema>;
