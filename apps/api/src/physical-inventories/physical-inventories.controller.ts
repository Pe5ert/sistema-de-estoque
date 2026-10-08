import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, ValidationPipe, type Type } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { UserResponseDto } from '../auth/user-response.dto';
import { PhysicalInventoryCancelDto, PhysicalInventoryCountsDto, PhysicalInventoryCreateDto, PhysicalInventoryQuery, PhysicalInventoryRevisionDto } from './physical-inventories.dto';
import { PhysicalInventoriesService } from './physical-inventories.service';

const input = (expectedType: Type<unknown>) => new ValidationPipe({ expectedType, transform: true, whitelist: true, forbidNonWhitelisted: true });
@ApiTags('physical-inventories') @ApiCookieAuth('stock_session') @Controller('physical-inventories') @UseGuards(JwtAuthGuard, RolesGuard)
export class PhysicalInventoriesController {
  constructor(@Inject(PhysicalInventoriesService) private readonly service: PhysicalInventoriesService) {}
  @Get() list(@Query(input(PhysicalInventoryQuery)) query: PhysicalInventoryQuery) { return this.service.list(query); }
  @Post() create(@Body(input(PhysicalInventoryCreateDto)) body: PhysicalInventoryCreateDto, @CurrentUser() user: UserResponseDto) { return this.service.create(body, user.id); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.service.get(id); }
  @Patch(':id/counts') counts(@Param('id', ParseUUIDPipe) id: string, @Body(input(PhysicalInventoryCountsDto)) body: PhysicalInventoryCountsDto, @CurrentUser() user: UserResponseDto) { return this.service.counts(id, body, user.id); }
  @Post(':id/refresh') refresh(@Param('id', ParseUUIDPipe) id: string, @Body(input(PhysicalInventoryRevisionDto)) body: PhysicalInventoryRevisionDto) { return this.service.refresh(id, body.revision); }
  @Post(':id/complete') @Roles('ADMIN', 'MANAGER') complete(@Param('id', ParseUUIDPipe) id: string, @Body(input(PhysicalInventoryRevisionDto)) body: PhysicalInventoryRevisionDto, @CurrentUser() user: UserResponseDto) { return this.service.complete(id, body.revision, user.id); }
  @Post(':id/cancel') @Roles('ADMIN', 'MANAGER') cancel(@Param('id', ParseUUIDPipe) id: string, @Body(input(PhysicalInventoryCancelDto)) body: PhysicalInventoryCancelDto, @CurrentUser() user: UserResponseDto) { return this.service.cancel(id, body, user.id); }
}
