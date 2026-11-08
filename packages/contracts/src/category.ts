import { z } from 'zod';

export const CategorySlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid category slug');

export const CategorySchema = z.object({
  slug: CategorySlugSchema,
  name: z.string().min(1),
});

export type Category = z.infer<typeof CategorySchema>;
