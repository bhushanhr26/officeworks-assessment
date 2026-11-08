import { CategorySlugSchema } from '@catalogue/contracts';
import type { Category, CategoryProducts } from '@catalogue/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler';
import type { CatalogueService } from '../services/catalogue-service';

const SlugParams = z.object({ slug: CategorySlugSchema });

export function categoriesRouter(catalogue: CatalogueService): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const body: Category[] = await catalogue.listCategories();
      res.json(body);
    }),
  );

  router.get(
    '/:slug/products',
    asyncHandler(async (req, res) => {
      const { slug } = SlugParams.parse(req.params);
      const body: CategoryProducts = await catalogue.getCategoryProducts(slug);
      res.json(body);
    }),
  );

  return router;
}
