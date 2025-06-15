/* eslint-disable @typescript-eslint/no-namespace */

import { Membership, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      membership?: Membership; 
    }

    interface Locals {
      user?: User;
    }
  }
}
