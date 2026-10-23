import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Injectable, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../auth/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PageQuery } from './inventory.dto';
import { Prisma } from '../generated/prisma/client';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CustomerInput {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
}
export class CustomerPatch {
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class CustomerQuery extends PageQuery {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) search?: string;
  @IsIn(['true', 'false', 'all']) active: string = 'true';
}
@Injectable()
export class CustomersService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async list(query: CustomerQuery) {
    const where = { ...(query.active === 'all' ? {} : { active: query.active !== 'false' }), ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { code: { contains: query.search, mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await this.db.$transaction([this.db.customer.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }), this.db.customer.count({ where })]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async get(id: string) { const item = await this.db.customer.findUnique({ where: { id } }); if (!item) throw new NotFoundException('Cliente não encontrado.'); return item; }
  async create(input: CustomerInput) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.db.customer.create({ data: { name: input.name, code: 'CLI-' + randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase() } }); }
      catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error; }
    }
    throw new ConflictException('Não foi possível gerar o código do cliente. Tente novamente.');
  }
  async patch(id: string, data: CustomerPatch) {
    if (!Object.keys(data).length || data.name === null || data.active === null) throw new BadRequestException('Informe nome ou situação válidos.');
    return this.db.$transaction(async tx => {
      // Shares the customer-row lock with sale validation; an inactivation cannot race a new sale.
      const rows = await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (!(rows as unknown[]).length) throw new NotFoundException('Cliente não encontrado.');
      return tx.customer.update({ where: { id }, data });
    });
  }
}
const input = (expectedType: new () => object) => new ValidationPipe({ expectedType, transform: true, whitelist: true, forbidNonWhitelisted: true });
@Controller('customers') @UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly service: CustomersService) {}
  @Get() @RequirePermission('customer.read') list(@Query(input(CustomerQuery)) query: CustomerQuery) { return this.service.list(query); }
  @Get(':id') @RequirePermission('customer.read') get(@Param('id', ParseUUIDPipe) id: string) { return this.service.get(id); }
  @Post() @RequirePermission('customer.create') create(@Body(input(CustomerInput)) data: CustomerInput) { return this.service.create(data); }
  @Patch(':id') @RequirePermission('customer.manage') patch(@Param('id', ParseUUIDPipe) id: string, @Body(input(CustomerPatch)) data: CustomerPatch) { return this.service.patch(id, data); }
}
