import { ProductIdSchema, SearchQuerySchema } from '@catalogue/contracts';
import type { Product } from '@catalogue/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler';
import type { CatalogueService } from '../services/catalogue-service';

const IdParams = z.object({ id: ProductIdSchema });

export function productsRouter(catalogue: CatalogueService): Router {
  const router = Router();

  // Registered before /:id so "featured" is not treated as an id.
  router.get(
    '/featured',
    asyncHandler(async (_req, res) => {
      const body: Product[] = await catalogue.getFeatured();
      res.json(body);
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { search } = SearchQuerySchema.parse(req.query);
      const body: Product[] = await catalogue.search(search);
      res.json(body);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = IdParams.parse(req.params);
      const body: Product = await catalogue.getById(id);
      res.json(body);
    }),
  );

  return router;
}
