import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, ValidationPipe, type Type } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserResponseDto } from '../auth/user-response.dto';
import { OrderInput, OrderQuery, OrderUpdate, ReceiptInput, SupplierInput, SupplierPatch, SupplierQuery, TransitionInput } from './purchases.dto';
import { PurchasesService } from './purchases.service';
const input = (expectedType: Type<unknown>) => new ValidationPipe({ expectedType, transform: true, whitelist: true, forbidNonWhitelisted: true });
@ApiTags('suppliers') @ApiCookieAuth('stock_session') @Controller('suppliers') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(@Inject(PurchasesService) private readonly service: PurchasesService) {}
  @Get() @RequirePermission('supplier.read') list(@Query(input(SupplierQuery)) query: SupplierQuery) { return this.service.suppliers(query); }
  @Get(':id') @RequirePermission('supplier.read') get(@Param('id', ParseUUIDPipe) id: string) { return this.service.supplier(id); }
  @Post() @RequirePermission('supplier.manage') create(@Body(input(SupplierInput)) data: SupplierInput, @CurrentUser() user: UserResponseDto) { return this.service.saveSupplier(data, user.id); }
  @Patch(':id') @RequirePermission('supplier.manage') update(@Param('id', ParseUUIDPipe) id: string, @Body(input(SupplierPatch)) data: SupplierPatch, @CurrentUser() user: UserResponseDto) { return this.service.saveSupplier(data, user.id, id); }
}
@ApiTags('purchases') @ApiCookieAuth('stock_session') @Controller('purchase-orders') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(@Inject(PurchasesService) private readonly service: PurchasesService) {}
  @Get() @RequirePermission('purchase.read') list(@Query(input(OrderQuery)) query: OrderQuery) { return this.service.orders(query); }
  @Get(':id') @RequirePermission('purchase.read') get(@Param('id', ParseUUIDPipe) id: string) { return this.service.order(id); }
  @Post() @RequirePermission('purchase.manage') create(@Body(input(OrderInput)) data: OrderInput, @CurrentUser() user: UserResponseDto) { return this.service.saveOrder(data, user.id); }
  @Patch(':id') @RequirePermission('purchase.manage') update(@Param('id', ParseUUIDPipe) id: string, @Body(input(OrderUpdate)) data: OrderUpdate, @CurrentUser() user: UserResponseDto) { return this.service.saveOrder(data, user.id, id); }
  @Post(':id/send') @RequirePermission('purchase.manage') send(@Param('id', ParseUUIDPipe) id: string, @Body(input(TransitionInput)) data: TransitionInput, @CurrentUser() user: UserResponseDto) { return this.service.transition(id, data.revision, 'send', user.id); }
  @Post(':id/cancel') @RequirePermission('purchase.manage') cancel(@Param('id', ParseUUIDPipe) id: string, @Body(input(TransitionInput)) data: TransitionInput, @CurrentUser() user: UserResponseDto) { return this.service.transition(id, data.revision, 'cancel', user.id); }
  @Get(':id/receipts/:receiptId') @RequirePermission('purchase.read') receipt(@Param('id', ParseUUIDPipe) id: string, @Param('receiptId', ParseUUIDPipe) receiptId: string) { return this.service.receipt(id, receiptId); }
  @Post(':id/receipts') @RequirePermission('purchase.receive') receive(@Param('id', ParseUUIDPipe) id: string, @Body(input(ReceiptInput)) data: ReceiptInput, @CurrentUser() user: UserResponseDto) { return this.service.receive(id, data, user.id); }
}
