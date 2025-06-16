import { Request } from 'express';

export function extractProjectId(req: Request): string | undefined {
  return req.params?.['projectId'] || req.body?.['projectId'] || req.query?.['projectId'];
}
