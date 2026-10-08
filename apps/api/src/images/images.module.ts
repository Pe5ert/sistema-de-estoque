import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { CloudinaryStorage } from './cloudinary-storage';

@Module({ imports: [AuthModule, PrismaModule], controllers: [ImagesController], providers: [ImagesService, CloudinaryStorage] })
export class ImagesModule {}
