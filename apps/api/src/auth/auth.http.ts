import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

export function configureAuthHttp(app: INestApplication, config: ConfigService) {
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
    credentials: true,
  });
}
