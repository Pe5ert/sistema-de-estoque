import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE } from './auth.config';
import type { UserResponseDto } from './user-response.dto';

export type AuthenticatedRequest = Request & { user?: UserResponseDto };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies: Record<string, unknown> | undefined = request.cookies;
    const token = cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    request.user = await this.auth.authenticate(token);
    return true;
  }
}
