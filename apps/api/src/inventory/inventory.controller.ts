import { Body, Controller, ForbiddenException, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, ValidationPipe, type Type } from '@nestjs/common';
import { hasPermission } from '@stock/shared';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';
import type { UserResponseDto } from '../auth/user-response.dto';
import { CategoryInput, CategoryPatch, LookupQuery, MovementInput, MovementQuery, ProductCreate, ProductPatch, ProductQuery } from './inventory.dto';
import { InventoryService } from './inventory.service';
import { DashboardService } from './dashboard.service';

// Explicit DTO types also work in tsx watch, which does not emit design metadata.
const input = (expectedType: Type<unknown>) => new ValidationPipe({ expectedType, transform: true, whitelist: true, forbidNonWhitelisted: true });

@ApiTags('categories') @ApiCookieAuth('stock_session') @Controller('categories') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(@Inject(InventoryService) private readonly service: InventoryService) {}
  @Get() @RequirePermission('category.read') list() { return this.service.categories(); }
  @Post() @RequirePermission('category.manage') create(@Body(input(CategoryInput)) data: CategoryInput) { return this.service.createCategory(data); }
  @Patch(':id') @RequirePermission('category.manage') update(@Param('id', ParseUUIDPipe) id: string, @Body(input(CategoryPatch)) data: CategoryPatch) { return this.service.patchCategory(id, data); }
}
@ApiTags('products') @ApiCookieAuth('stock_session') @Controller('products') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(@Inject(InventoryService) private readonly service: InventoryService) {}
  @Get() @RequirePermission('product.read') list(@Query(input(ProductQuery)) query: ProductQuery) { return this.service.products(query); }
  @Get('lookup') @RequirePermission('product.read') lookup(@Query(input(LookupQuery)) query: LookupQuery) { return this.service.lookup(query.code); }
  @Get(':id') @RequirePermission('product.read') get(@Param('id', ParseUUIDPipe) id: string) { return this.service.product(id); }
  @Post() @RequirePermission('product.create') create(@Body(input(ProductCreate)) data: ProductCreate, @CurrentUser() user: UserResponseDto) { return this.service.createProduct(data, user.id); }
  @Patch(':id') @RequirePermission('product.update') update(@Param('id', ParseUUIDPipe) id: string, @Body(input(ProductPatch)) data: ProductPatch) { return this.service.patchProduct(id, data); }
}
@ApiTags('stock-movements') @ApiCookieAuth('stock_session') @Controller('stock-movements') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class MovementsController {
  constructor(@Inject(InventoryService) private readonly service: InventoryService) {}
  @Get() @RequirePermission('stock.read') list(@Query(input(MovementQuery)) query: MovementQuery) { return this.service.movements(query); }
  @Get(':id') @RequirePermission('stock.read') get(@Param('id', ParseUUIDPipe) id: string) { return this.service.movement(id); }
  @Post() @RequirePermission('stock.move') create(@Body(input(MovementInput)) data: MovementInput, @CurrentUser() user: UserResponseDto) {
    if ((data.type === 'ADJUSTMENT_IN' || data.type === 'ADJUSTMENT_OUT' || data.reason === 'INVENTORY_ADJUSTMENT') && !hasPermission(user.role, 'stock.adjust')) {
      throw new ForbiddenException('Você não tem permissão para ajustar o estoque.');
    }
    return this.service.move(data, user.id);
  }
}
@ApiTags('dashboard') @ApiCookieAuth('stock_session') @Controller('dashboard') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly service: DashboardService) {}
  @Get('summary') @RequirePermission('dashboard.read') summary() { return this.service.summary(); }
}
