import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';

@Module({ imports: [AuthModule], controllers: [BackupsController], providers: [BackupsService] })
export class BackupsModule {}
