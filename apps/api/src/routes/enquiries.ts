import type { EnquiryAccepted } from '@catalogue/contracts';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../http/async-handler';
import type { EnquiryService } from '../services/enquiry-service';

export function enquiriesRouter(enquiries: EnquiryService, rateLimiter: RequestHandler): Router {
  const router = Router();

  router.post(
    '/',
    rateLimiter,
    asyncHandler(async (req, res) => {
      // Validation and honeypot are handled in the service. A dropped (bot) submission
      // gets the same 202 as a real one.
      await enquiries.submit(req.body);
      const body: EnquiryAccepted = { status: 'accepted' };
      res.status(202).json(body);
    }),
  );

  return router;
}
