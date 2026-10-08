import { Controller, Inject, NotFoundException, Param, ParseUUIDPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserResponseDto } from '../auth/user-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ImagesService } from './images.service';
import { MAX_IMAGE_BYTES } from './image-file';
import type {} from 'multer';

const upload = () => FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1 } });
@Controller('product-images') @UseGuards(JwtAuthGuard, PermissionsGuard, ThrottlerGuard)
export class ImagesController {
  constructor(@Inject(ImagesService) private readonly service: ImagesService, @Inject(PrismaService) private readonly db: PrismaService) {}
  @Post() @RequirePermission('product.create') @Throttle({ default: { limit: 10, ttl: 60_000 } }) @UseInterceptors(upload())
  create(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: UserResponseDto) { return this.service.upload(file, user.id); }
  @Post(':productId') @RequirePermission('product.update') @Throttle({ default: { limit: 10, ttl: 60_000 } }) @UseInterceptors(upload())
  async update(@Param('productId', ParseUUIDPipe) productId: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: UserResponseDto) {
    if (!await this.db.product.findUnique({ where: { id: productId }, select: { id: true } })) throw new NotFoundException('Produto não encontrado.');
    return this.service.upload(file, user.id);
  }
}
