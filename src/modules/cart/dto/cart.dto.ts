import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { MAX_ITEM_QUANTITY } from '../entities/cart-item.entity';

export class AddCartItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: MAX_ITEM_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, minimum: 1, maximum: MAX_ITEM_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity: number;
}

export class CartItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty({ example: 'Chicken Wings' }) productName: string;
  @ApiProperty({ format: 'uuid' }) variantId: string;
  @ApiProperty({ example: '8pc' }) variantName: string;
  @ApiProperty({ example: 899 }) unitPriceMinor: number;
  @ApiProperty({ example: 2 }) quantity: number;
  @ApiProperty({ example: 1798 }) lineTotalMinor: number;
  @ApiProperty({ description: 'False if the product/variant was disabled or removed after being added' })
  isAvailable: boolean;
}

export class CartResponseDto {
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) id: string | null;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ type: [CartItemResponseDto] }) items: CartItemResponseDto[];
  @ApiProperty({ example: 2, description: 'Total quantity of available items' }) itemCount: number;
  @ApiProperty({ example: 1798, description: 'Sum of available lines, minor units' })
  totalAmountMinor: number;
  @ApiProperty({ example: 'USD' }) currency: string;
}
