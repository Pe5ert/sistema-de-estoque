import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { purchaseStatuses } from '@stock/shared';
import { PageQuery } from '../inventory/inventory.dto';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const nullable = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value;
const uuid = ({ value }: { value: unknown }) => typeof value === 'string' ? value.toLowerCase() : value;
export class SupplierInput {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(200) tradeName?: string | null;
  @IsOptional() @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.replace(/[.\-/\s]/g, '').toUpperCase() || null : value) @IsString() @Matches(/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/) document?: string | null;
  @IsOptional() @Transform(nullable) @IsEmail() @MaxLength(180) email?: string | null;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(120) contact?: string | null;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(1000) address?: string | null;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(5000) notes?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class SupplierPatch extends PartialType(SupplierInput) {}
export class SupplierQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsIn(['true', 'false', 'all']) active?: string;
}
export class OrderItemInput {
  @Transform(uuid) @IsUUID() productId!: string;
  @IsString() @Matches(/^\d{1,15}(?:\.\d{1,3})?$/) quantity!: string;
  @IsString() @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) unitCost!: string;
}
export class OrderInput {
  @Transform(uuid) @IsUUID() supplierId!: string;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(5000) notes?: string | null;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => OrderItemInput) items!: OrderItemInput[];
}
export class OrderUpdate extends OrderInput { @IsInt() @Min(1) revision!: number; }
export class TransitionInput { @IsInt() @Min(1) revision!: number; }
export class OrderQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @Transform(uuid) @IsUUID() supplierId?: string;
  @IsOptional() @IsIn(purchaseStatuses) status?: typeof purchaseStatuses[number];
}
export class ReceiptItemInput {
  @Transform(uuid) @IsUUID() orderItemId!: string;
  @IsString() @Matches(/^\d{1,15}(?:\.\d{1,3})?$/) quantity!: string;
}
export class ReceiptInput {
  @Transform(uuid) @IsUUID() receiptId!: string;
  @IsOptional() @Transform(nullable) @IsString() @MaxLength(5000) notes?: string | null;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ReceiptItemInput) items!: ReceiptItemInput[];
}
