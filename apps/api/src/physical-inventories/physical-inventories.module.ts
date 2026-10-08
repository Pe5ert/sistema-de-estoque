import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PhysicalInventoriesController } from './physical-inventories.controller';
import { PhysicalInventoriesService } from './physical-inventories.service';

@Module({ imports: [AuthModule], providers: [PhysicalInventoriesService], controllers: [PhysicalInventoriesController] })
export class PhysicalInventoriesModule {}
