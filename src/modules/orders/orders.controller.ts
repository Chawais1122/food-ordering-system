import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { API_KEY_SECURITY } from '../../common/guards/api-key.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { OrderListResponseDto, OrderResponseDto, PlaceOrderDto } from './dto/order.dto';
import { IdempotencyKey } from './idempotency-key.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiSecurity(API_KEY_SECURITY)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Place an order from the current cart',
    description:
      'Creates a PENDING order from all cart items and empties the cart. Retrying with the same ' +
      'Idempotency-Key returns the original order (200, header Idempotent-Replayed: true) instead of creating a duplicate.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Client-generated unique key, e.g. a UUID',
  })
  @ApiCreatedResponse({ type: OrderResponseDto, description: 'Order created' })
  @ApiOkResponse({ type: OrderResponseDto, description: 'Replay of an already-created order' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Missing/invalid Idempotency-Key or body' })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Idempotency-Key reused with a different body',
  })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: 'Empty cart or unavailable items' })
  async placeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: PlaceOrderDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<OrderResponseDto> {
    const { order, replayed } = await this.ordersService.placeOrder(user.id, dto, idempotencyKey);
    res.status(replayed ? HttpStatus.OK : HttpStatus.CREATED);
    if (replayed) res.setHeader('Idempotent-Replayed', 'true');
    return order;
  }

  @Get()
  @ApiOperation({ summary: "List the current user's orders, newest first" })
  @ApiOkResponse({ type: OrderListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<OrderListResponseDto> {
    return this.ordersService.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current user's orders" })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findOne(user.id, id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay a PENDING card order (moves it to PAID)' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Order already paid' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: 'Not a card order' })
  @ApiBadGatewayResponse({ type: ErrorResponseDto, description: 'Payment provider unavailable' })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.pay(user.id, id);
  }
}
