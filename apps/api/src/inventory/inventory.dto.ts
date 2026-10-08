import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { movementReasons, movementTypes, productUnits } from '@stock/shared';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class PageQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class CategoryInput {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class CategoryPatch extends PartialType(CategoryInput) {}
export class InitialEntryInput {
  @IsString() @Matches(/^\d{1,15}(?:\.\d{1,3})?$/) quantity!: string;
}
export class ProductInput {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80) sku!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) barcode?: string | null;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(10000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(2048) @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false, disallow_auth: true }) imageUrl?: string | null;
  @IsUUID() categoryId!: string;
  @IsIn(productUnits) unit!: typeof productUnits[number];
  @IsOptional() @IsString() @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) costPrice?: string | null;
  @IsOptional() @IsString() @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) salePrice?: string | null;
  @IsString() @Matches(/^\d{1,15}(?:\.\d{1,3})?$/) minimumStock!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class ProductCreate extends ProductInput {
  @IsOptional() @ValidateNested() @Type(() => InitialEntryInput) initialEntry?: InitialEntryInput;
}
export class ProductPatch extends PartialType(ProductInput) {}
export class ProductQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsUUID() category?: string;
  @IsOptional() @IsIn(['OUT', 'LOW', 'NORMAL', 'ATTENTION']) stockStatus?: string;
  @IsOptional() @IsIn(['true', 'false', 'all']) active?: string;
}
export class LookupQuery {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80) code!: string;
}
export class MovementInput {
  @IsUUID() productId!: string;
  @IsIn(movementTypes) type!: typeof movementTypes[number];
  @IsString() @Matches(/^\d{1,15}(?:\.\d{1,3})?$/) quantity!: string;
  @IsIn(movementReasons) reason!: typeof movementReasons[number];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) reference?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(10000) notes?: string | null;
}
export class MovementQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsIn(movementTypes) type?: typeof movementTypes[number];
  @IsOptional() @IsIn(movementReasons) reason?: typeof movementReasons[number];
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/) from?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/) to?: string;
}
