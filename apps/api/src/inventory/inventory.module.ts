import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesController, DashboardController, MovementsController, ProductsController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DashboardService } from './dashboard.service';

@Module({ imports: [AuthModule, PrismaModule], controllers: [CategoriesController, ProductsController, MovementsController, DashboardController], providers: [InventoryService, DashboardService], exports: [InventoryService] })
export class InventoryModule {}
