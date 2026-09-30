import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto';
import { ProductVariant } from '../entities/product-variant.entity';
import { Product } from '../entities/product.entity';

export class VariantResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: '8pc' }) name: string;
  @ApiProperty({ example: 'WINGS-8PC' }) sku: string;
  @ApiProperty({ example: 899, description: 'Minor units' }) priceMinor: number;
  @ApiProperty() isAvailable: boolean;

  static from(variant: ProductVariant): VariantResponseDto {
    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceMinor: variant.priceMinor,
      isAvailable: variant.isAvailable,
    };
  }
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Chicken Wings' }) name: string;
  @ApiPropertyOptional({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ example: 'Chicken' }) category: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: [VariantResponseDto] }) variants: VariantResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      isActive: product.isActive,
      variants: [...(product.variants ?? [])]
        .sort((a, b) => a.priceMinor - b.priceMinor)
        .map(VariantResponseDto.from),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] }) data: ProductResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
