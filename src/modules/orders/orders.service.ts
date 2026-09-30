import {
  BadGatewayException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { buildPaginationMeta, PaginationQueryDto, toOffset } from '../../common/dto/pagination.dto';
import { isUniqueViolation } from '../../common/utils/postgres-error.util';
import { TypedConfigService } from '../../config/typed-config';
import { JobType } from '../../infrastructure/jobs/job.types';
import { JobsService } from '../../infrastructure/jobs/jobs.service';
import { priceCart } from '../cart/cart-pricing';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { OrderListResponseDto, OrderResponseDto, PlaceOrderDto } from './dto/order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, UQ_ORDERS_USER_IDEMPOTENCY_KEY } from './entities/order.entity';
import { OrderCreatedEvent, OrderPaidEvent } from './order-events';
import { OrderStatus, PaymentType } from './order.enums';
import { PaymentGateway } from './payments/payment-gateway';

export interface PlaceOrderResult {
  order: OrderResponseDto;
  replayed: boolean;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly currency: string;

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly jobs: JobsService,
    private readonly paymentGateway: PaymentGateway,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.currency = config.get('currency', { infer: true });
  }

  async placeOrder(userId: string, dto: PlaceOrderDto, idempotencyKey: string): Promise<PlaceOrderResult> {
    const existing = await this.findByIdempotencyKey(this.dataSource.manager, userId, idempotencyKey);
    if (existing) return this.replay(existing, dto);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const cart = await manager
          .getRepository(Cart)
          .createQueryBuilder('cart')
          .setLock('pessimistic_write')
          .where('cart.userId = :userId', { userId })
          .getOne();
        if (!cart) throw new UnprocessableEntityException('Cart is empty');

        const committed = await this.findByIdempotencyKey(manager, userId, idempotencyKey);
        if (committed) return this.replay(committed, dto);

        const order = await this.createOrderFromCart(manager, cart, userId, dto, idempotencyKey);
        return { order: OrderResponseDto.from(order), replayed: false };
      });
    } catch (error) {
      if (isUniqueViolation(error, UQ_ORDERS_USER_IDEMPOTENCY_KEY)) {
        const winner = await this.findByIdempotencyKey(this.dataSource.manager, userId, idempotencyKey);
        if (winner) return this.replay(winner, dto);
      }
      throw error;
    }
  }

  async list(userId: string, query: PaginationQueryDto): Promise<OrderListResponseDto> {
    const [orders, total] = await this.orders.findAndCount({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
      skip: toOffset(query),
      take: query.limit,
    });
    return { data: orders.map(OrderResponseDto.from), meta: buildPaginationMeta(query, total) };
  }

  async findOne(userId: string, orderId: string): Promise<OrderResponseDto> {
    return OrderResponseDto.from(await this.getOwnedOrder(userId, orderId));
  }

  async pay(userId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.getOwnedOrder(userId, orderId);
    if (order.paymentType !== PaymentType.CARD) {
      throw new UnprocessableEntityException('Cash on delivery orders are settled on delivery');
    }
    this.assertPending(order);

    let charge;
    try {
      charge = await this.paymentGateway.charge({
        orderId: order.id,
        amountMinor: order.totalAmountMinor,
        currency: order.currency,
        idempotencyKey: `order-${order.id}`,
      });
    } catch (error) {
      this.logger.error(`Payment gateway error for order ${order.id}`, (error as Error).stack);
      throw new BadGatewayException('Payment provider is unavailable, please retry');
    }
    if (!charge.approved) {
      throw new HttpException(charge.declineReason ?? 'Payment was declined', HttpStatus.PAYMENT_REQUIRED);
    }
    return this.markPaid(order, charge.reference);
  }

  async markPaidByAdmin(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orders.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('Order not found');
    this.assertPending(order);
    return this.markPaid(order, `manual-${order.paymentType.toLowerCase()}`);
  }

  private async createOrderFromCart(
    manager: EntityManager,
    cart: Cart,
    userId: string,
    dto: PlaceOrderDto,
    idempotencyKey: string,
  ): Promise<Order> {
    const cartItems = await manager.find(CartItem, {
      where: { cartId: cart.id },
      relations: { product: true, variant: true },
      withDeleted: true,
      order: { createdAt: 'ASC' },
    });
    if (cartItems.length === 0) throw new UnprocessableEntityException('Cart is empty');

    const priced = priceCart(cartItems);
    const unavailable = priced.lines.filter((line) => !line.isAvailable);
    if (unavailable.length > 0) {
      const names = unavailable.map(({ item }) => `${item.product?.name} (${item.variant?.name})`);
      throw new UnprocessableEntityException(
        `Some items are no longer available, please remove them: ${names.join(', ')}`,
      );
    }

    const order = await manager.save(
      manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        paymentType: dto.paymentType,
        totalAmountMinor: priced.totalAmountMinor,
        currency: this.currency,
        idempotencyKey,
        items: priced.lines.map(({ item, unitPriceMinor, lineTotalMinor }) =>
          manager.create(OrderItem, {
            productId: item.productId,
            variantId: item.variantId,
            productName: item.product.name,
            variantName: item.variant.name,
            unitPriceMinor,
            quantity: item.quantity,
            lineTotalMinor,
          }),
        ),
      }),
    );

    const event: OrderCreatedEvent = {
      orderId: order.id,
      userId,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency,
      paymentType: order.paymentType,
      itemCount: priced.itemCount,
    };
    await this.jobs.enqueue(manager, JobType.ORDER_CREATED, event);
    await manager.delete(CartItem, { cartId: cart.id });
    return order;
  }

  private async markPaid(order: Order, paymentReference: string): Promise<OrderResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(Order)
        .set({ status: OrderStatus.PAID, paymentReference, paidAt: () => 'now()' })
        .where('id = :orderId AND status = :pending', { orderId: order.id, pending: OrderStatus.PENDING })
        .execute();
      if (!result.affected) throw new ConflictException('Order is already paid');

      const event: OrderPaidEvent = {
        orderId: order.id,
        userId: order.userId,
        totalAmountMinor: order.totalAmountMinor,
        currency: order.currency,
        paymentReference,
      };
      await this.jobs.enqueue(manager, JobType.ORDER_PAID, event);
    });

    const paid = await this.orders.findOneOrFail({ where: { id: order.id }, relations: { items: true } });
    return OrderResponseDto.from(paid);
  }

  private replay(order: Order, dto: PlaceOrderDto): PlaceOrderResult {
    if (order.paymentType !== dto.paymentType) {
      throw new ConflictException('Idempotency-Key was already used with a different request');
    }
    return { order: OrderResponseDto.from(order), replayed: true };
  }

  private findByIdempotencyKey(
    manager: EntityManager,
    userId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    return manager.findOne(Order, { where: { userId, idempotencyKey }, relations: { items: true } });
  }

  private async getOwnedOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId, userId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private assertPending(order: Order): void {
    if (order.status !== OrderStatus.PENDING) throw new ConflictException('Order is already paid');
  }
}
