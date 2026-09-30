import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus, PaymentType } from '../order.enums';

export class PlaceOrderDto {
  @ApiProperty({ enum: PaymentType, example: PaymentType.CARD })
  @IsEnum(PaymentType)
  paymentType: PaymentType;
}

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' }) productId: string;
  @ApiProperty({ format: 'uuid' }) variantId: string;
  @ApiProperty({ example: 'Burger' }) productName: string;
  @ApiProperty({ example: 'Double' }) variantName: string;
  @ApiProperty({ example: 1299 }) unitPriceMinor: number;
  @ApiProperty({ example: 2 }) quantity: number;
  @ApiProperty({ example: 2598 }) lineTotalMinor: number;

  static from(item: OrderItem): OrderItemResponseDto {
    return {
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      unitPriceMinor: item.unitPriceMinor,
      quantity: item.quantity,
      lineTotalMinor: item.lineTotalMinor,
    };
  }
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Unique order id' }) id: string;
  @ApiProperty({ format: 'uuid' }) userId: string;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty({ enum: PaymentType }) paymentType: PaymentType;
  @ApiProperty({ example: 2598 }) totalAmountMinor: number;
  @ApiProperty({ example: 'USD' }) currency: string;
  @ApiProperty({ type: [OrderItemResponseDto] }) items: OrderItemResponseDto[];
  @ApiPropertyOptional({ nullable: true, type: String }) paymentReference: string | null;
  @ApiPropertyOptional({ nullable: true, type: Date }) paidAt: Date | null;
  @ApiProperty() createdAt: Date;

  static from(order: Order): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      paymentType: order.paymentType,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency,
      items: (order.items ?? []).map(OrderItemResponseDto.from),
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
    };
  }
}

export class OrderListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) data: OrderResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
