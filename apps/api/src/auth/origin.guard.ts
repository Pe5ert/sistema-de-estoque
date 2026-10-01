import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    // Cookies are sent automatically: CORS and SameSite alone are insufficient.
    const origin = request.get('origin');
    if (origin !== this.config.getOrThrow<string>('WEB_ORIGIN')) {
      throw new ForbiddenException('Origem da requisição não autorizada.');
    }
    return true;
  }
}
