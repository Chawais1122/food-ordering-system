import { UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { TypedConfigService } from '../../config/typed-config';
import { JobsService } from '../../infrastructure/jobs/jobs.service';
import { CartItem } from '../cart/entities/cart-item.entity';
import { OrderStatus, PaymentType } from './order.enums';
import { OrdersService } from './orders.service';
import { PaymentGateway } from './payments/payment-gateway';

const USER_ID = 'user-1';
const CART_ID = 'cart-1';
const dto = { paymentType: PaymentType.CASH_ON_DELIVERY };

const cartItem = (id: string, priceMinor: number, quantity: number) =>
  ({
    id,
    cartId: CART_ID,
    productId: `product-${id}`,
    variantId: `variant-${id}`,
    quantity,
    product: { name: `Product ${id}`, isActive: true, deletedAt: null },
    variant: { name: 'Regular', priceMinor, isAvailable: true, deletedAt: null },
  }) as unknown as CartItem;

describe('OrdersService', () => {
  let manager: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    getRepository: jest.Mock;
  };
  let jobs: { enqueue: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    const cartQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: CART_ID, userId: USER_ID }),
    };
    manager = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([cartItem('a', 500, 2), cartItem('b', 1250, 1)]),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (order) => ({ ...order, id: randomUUID(), createdAt: new Date() })),
      delete: jest.fn(),
      getRepository: jest.fn(() => ({ createQueryBuilder: () => cartQuery })),
    };
    jobs = { enqueue: jest.fn() };
    const dataSource = { manager, transaction: jest.fn((work) => work(manager)) } as unknown as DataSource;
    const config = { get: jest.fn(() => 'USD') } as unknown as TypedConfigService;

    service = new OrdersService(
      {} as never,
      dataSource,
      jobs as unknown as JobsService,
      {} as PaymentGateway,
      config,
    );
  });

  it('creates a pending order from the cart contents', async () => {
    const { order, replayed } = await service.placeOrder(USER_ID, dto, 'key-1');

    expect(replayed).toBe(false);
    expect(order).toMatchObject({
      userId: USER_ID,
      status: OrderStatus.PENDING,
      paymentType: PaymentType.CASH_ON_DELIVERY,
      totalAmountMinor: 2250,
      currency: 'USD',
    });
    expect(order.items).toEqual([
      expect.objectContaining({ variantId: 'variant-a', quantity: 2, lineTotalMinor: 1000 }),
      expect.objectContaining({ variantId: 'variant-b', quantity: 1, lineTotalMinor: 1250 }),
    ]);
  });

  it('rejects an empty cart', async () => {
    manager.find.mockResolvedValue([]);

    await expect(service.placeOrder(USER_ID, dto, 'key-1')).rejects.toThrow(
      new UnprocessableEntityException('Cart is empty'),
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('gives each new order its own id', async () => {
    const first = await service.placeOrder(USER_ID, dto, 'key-1');
    const second = await service.placeOrder(USER_ID, dto, 'key-2');

    expect(first.order.id).toEqual(expect.any(String));
    expect(first.order.id).not.toBe(second.order.id);
  });

  it('returns the existing order when the idempotency key is reused', async () => {
    const { order } = await service.placeOrder(USER_ID, dto, 'key-1');
    manager.findOne.mockResolvedValue(order);

    const retry = await service.placeOrder(USER_ID, dto, 'key-1');

    expect(retry).toMatchObject({ replayed: true, order: { id: order.id } });
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('clears the cart after the order is placed', async () => {
    await service.placeOrder(USER_ID, dto, 'key-1');

    expect(manager.delete).toHaveBeenCalledWith(CartItem, { cartId: CART_ID });
  });
});
