import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { BackupsModule } from './backups/backups.module';
import { ImportsModule } from './imports/imports.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PhysicalInventoriesModule } from './physical-inventories/physical-inventories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    InventoryModule,
    BackupsModule,
    ImportsModule,
    PurchasesModule,
    PhysicalInventoriesModule,
  ],
})
export class AppModule {}
