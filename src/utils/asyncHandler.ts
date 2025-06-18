import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler<Req = Request, Res = Response> = (
  req: Req,
  res: Res,
  next: NextFunction,
) => Promise<unknown>;

const asyncHandler =
  <R extends Request, S extends Response>(fn: AsyncRouteHandler<R, S>) =>
  (req: R, res: S, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  export default asyncHandler;
