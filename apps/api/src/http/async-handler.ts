import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 does not forward rejected promises to the error handler; this does. */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
