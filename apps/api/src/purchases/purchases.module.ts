import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuppliersController, PurchaseOrdersController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
@Module({ imports: [AuthModule, InventoryModule, PrismaModule], controllers: [SuppliersController, PurchaseOrdersController], providers: [PurchasesService] })
export class PurchasesModule {}
