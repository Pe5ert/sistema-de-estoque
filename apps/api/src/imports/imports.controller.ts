import { Body, CanActivate, Controller, ExecutionContext, Get, Inject, Injectable, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile, UploadedFile, UseGuards, UseInterceptors, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { canImportProducts, PRODUCT_IMPORT_ACTION } from '@stock/shared';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserResponseDto } from '../auth/user-response.dto';
import { ImportsService } from './imports.service';
import { MAX_IMPORT_BYTES } from './import-file';
import type {} from 'multer';

@Injectable()
export class ImportPermissionGuard implements CanActivate {
  readonly action = PRODUCT_IMPORT_ACTION;
  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!canImportProducts(user?.role)) throw new ForbiddenException('Você não tem permissão para importar produtos.');
    return true;
  }
}
@ApiTags('imports') @ApiCookieAuth('stock_session') @Controller('imports') @UseGuards(JwtAuthGuard, ImportPermissionGuard)
export class ImportsController {
  constructor(@Inject(ImportsService) private readonly service: ImportsService) {}
  @Get('template') async template(@Query('format') format = 'xlsx') {
    return new StreamableFile(await this.service.template(format), { type: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', disposition: `attachment; filename="modelo-produtos.${format}"` });
  }
  @Get() list(@CurrentUser() user: UserResponseDto) { return this.service.list(user.id); }
  @Post() @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES, files: 1, fields: 0 } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: UserResponseDto) { return this.service.upload(file, user.id); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserResponseDto) { return this.service.get(id, user.id); }
  @Patch(':id') setup(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: UserResponseDto) { return this.service.setup(id, user.id, body); }
  @Post(':id/confirm') confirm(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: UserResponseDto) { return this.service.confirm(id, user.id, body); }
}
