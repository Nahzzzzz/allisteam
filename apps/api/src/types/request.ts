import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user';

export interface RequestWithContext extends Request {
  requestId?: string;
  user?: AuthUser;
}
