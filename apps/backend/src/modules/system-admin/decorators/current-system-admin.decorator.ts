import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface SystemAdminPayload {
  id: string;
  email: string;
  fullName: string;
  sessionId: string;
}

export const CurrentSystemAdmin = createParamDecorator(
  (data: keyof SystemAdminPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { systemAdmin?: SystemAdminPayload }>();
    const admin = request.systemAdmin;
    if (!admin) return null;
    return data ? admin[data] : admin;
  },
);
