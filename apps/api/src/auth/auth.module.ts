import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SESSION_SECONDS } from './auth.config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OriginGuard } from './origin.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: SESSION_SECONDS, algorithm: 'HS256', issuer: 'stock-api', audience: 'stock-web' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'stock-api', audience: 'stock-web' },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 8 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PermissionsGuard, { provide: APP_GUARD, useClass: OriginGuard }],
  exports: [AuthService, JwtAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
