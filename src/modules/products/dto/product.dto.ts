import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
export const MAX_PRICE_MINOR = 100_000_000;

export class CreateVariantDto {
  @ApiProperty({ example: '8pc' })
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  name: string;

  @ApiProperty({ example: 'WINGS-8PC' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9-_]{2,64}$/, { message: 'sku must be 2-64 chars of A-Z, 0-9, - or _' })
  sku: string;

  @ApiProperty({ example: 899, description: 'Price in minor units (e.g. cents)' })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_MINOR)
  priceMinor: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}

export class CreateProductDto {
  @ApiProperty({ example: 'Chicken Wings' })
  @Transform(trim)
  @IsString()
  @Length(2, 150)
  name: string;

  @ApiPropertyOptional({ example: 'Crispy wings tossed in our house sauce' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'Chicken' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  category: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['variants'] as const)) {}

export class ProductListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Burgers' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: 'wings', description: 'Case-insensitive name search' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  search?: string;
}
