import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { MAX_PHYSICAL_INVENTORY_COUNT_UPDATES, physicalInventoryStatuses } from '@stock/shared';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class PhysicalInventoryQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(20) limit = 20;
  @IsOptional() @IsIn(physicalInventoryStatuses) status?: typeof physicalInventoryStatuses[number];
}
export class PhysicalInventoryCreateDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) title!: string;
  @ValidateIf((_object, value) => value !== undefined) @IsUUID() categoryId?: string;
}
export class PhysicalInventoryRevisionDto {
  @IsInt() @Min(1) @Max(2147483646) revision!: number;
}
export class PhysicalInventoryCountItemDto {
  @IsUUID() productId!: string;
  @ValidateIf((_object, value) => value !== null) @IsString() @Matches(/^\d{1,15}(?:\.\d{1,3})?$/) countedQuantity!: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) notes?: string | null;
}
export class PhysicalInventoryCountsDto extends PhysicalInventoryRevisionDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_PHYSICAL_INVENTORY_COUNT_UPDATES)
  @ValidateNested({ each: true }) @Type(() => PhysicalInventoryCountItemDto) items!: PhysicalInventoryCountItemDto[];
}
export class PhysicalInventoryCancelDto extends PhysicalInventoryRevisionDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) notes?: string | null;
}
