import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportsController, ImportPermissionGuard } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({ imports: [AuthModule, InventoryModule, PrismaModule], controllers: [ImportsController], providers: [ImportsService, ImportPermissionGuard] })
export class ImportsModule {}
