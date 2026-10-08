import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@stock/shared';
import type { AuthenticatedRequest } from './jwt-auth.guard';

const PERMISSION_KEY = 'auth:permission';
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride<Permission>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!permission || !hasPermission(user?.role, permission)) {
      throw new ForbiddenException('Você não tem permissão para esta ação.');
    }
    return true;
  }
}
