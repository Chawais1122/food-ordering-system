import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypedConfigService } from '../../config/typed-config';
import { ProductsService } from '../products/products.service';
import { CartService } from './cart.service';
import { CartItem } from './entities/cart-item.entity';

const USER_ID = 'user-1';
const CART_ID = 'cart-1';

const cartItem = (id: string, priceMinor: number, quantity: number, isAvailable = true) =>
  ({
    id,
    cartId: CART_ID,
    productId: `product-${id}`,
    variantId: `variant-${id}`,
    quantity,
    product: { name: `Product ${id}`, isActive: true, deletedAt: null },
    variant: { name: 'Regular', priceMinor, isAvailable, deletedAt: null },
  }) as unknown as CartItem;

describe('CartService', () => {
  let carts: { findOneBy: jest.Mock };
  let cartItems: { find: jest.Mock; update: jest.Mock; delete: jest.Mock; createQueryBuilder: jest.Mock };
  let ownedItemQuery: { innerJoin: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let dataSource: { query: jest.Mock };
  let productsService: { getPurchasableVariant: jest.Mock };
  let service: CartService;

  beforeEach(() => {
    ownedItemQuery = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(cartItem('a', 500, 1)),
    };
    carts = { findOneBy: jest.fn().mockResolvedValue({ id: CART_ID, userId: USER_ID }) };
    cartItems = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ownedItemQuery),
    };
    dataSource = { query: jest.fn() };
    productsService = { getPurchasableVariant: jest.fn().mockResolvedValue({}) };
    const config = { get: jest.fn(() => 'USD') } as unknown as TypedConfigService;

    service = new CartService(
      carts as never,
      cartItems as never,
      dataSource as unknown as DataSource,
      productsService as unknown as ProductsService,
      config,
    );
  });

  describe('addItem', () => {
    const dto = { productId: 'product-a', variantId: 'variant-a', quantity: 2 };

    it('adds the item to the user cart', async () => {
      dataSource.query.mockResolvedValueOnce([{ id: CART_ID }]).mockResolvedValueOnce([{ id: 'a' }]);
      cartItems.find.mockResolvedValue([cartItem('a', 500, 2)]);

      const cart = await service.addItem(USER_ID, dto);

      expect(dataSource.query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO cart_items'), [
        CART_ID,
        'product-a',
        'variant-a',
        2,
        99,
      ]);
      expect(cart.items).toEqual([expect.objectContaining({ variantId: 'variant-a', quantity: 2 })]);
    });

    it('rejects an invalid variant without touching the cart', async () => {
      productsService.getPurchasableVariant.mockRejectedValue(new NotFoundException('Product variant not found'));

      await expect(service.addItem(USER_ID, dto)).rejects.toThrow(NotFoundException);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('rejects when the total quantity would exceed the maximum', async () => {
      dataSource.query.mockResolvedValueOnce([{ id: CART_ID }]).mockResolvedValueOnce([]);

      await expect(service.addItem(USER_ID, dto)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  it('updates the quantity of an owned item', async () => {
    await service.updateItem(USER_ID, 'a', { quantity: 5 });

    expect(cartItems.update).toHaveBeenCalledWith({ id: 'a' }, { quantity: 5 });
  });

  it('removes an owned item', async () => {
    await service.removeItem(USER_ID, 'a');

    expect(cartItems.delete).toHaveBeenCalledWith({ id: 'a' });
  });

  it("rejects changes to an item outside the user's cart", async () => {
    ownedItemQuery.getOne.mockResolvedValue(null);

    await expect(service.removeItem(USER_ID, 'someone-elses')).rejects.toThrow(NotFoundException);
    expect(cartItems.delete).not.toHaveBeenCalled();
  });

  describe('totals', () => {
    it('sums unit price times quantity across items', async () => {
      cartItems.find.mockResolvedValue([cartItem('a', 500, 2), cartItem('b', 1250, 1)]);

      const cart = await service.getCart(USER_ID);

      expect(cart.items.map((item) => item.lineTotalMinor)).toEqual([1000, 1250]);
      expect(cart.totalAmountMinor).toBe(2250);
      expect(cart.itemCount).toBe(3);
    });

    it('excludes unavailable items from the total', async () => {
      cartItems.find.mockResolvedValue([cartItem('a', 500, 2), cartItem('b', 1250, 1, false)]);

      const cart = await service.getCart(USER_ID);

      expect(cart.totalAmountMinor).toBe(1000);
      expect(cart.itemCount).toBe(2);
    });
  });
});
