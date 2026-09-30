import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TypedConfigService } from '../../config/typed-config';
import { ProductsService } from '../products/products.service';
import { priceCart } from './cart-pricing';
import { AddCartItemDto, CartResponseDto, UpdateCartItemDto } from './dto/cart.dto';
import { CartItem, MAX_ITEM_QUANTITY } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

@Injectable()
export class CartService {
  private readonly currency: string;

  constructor(
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly cartItems: Repository<CartItem>,
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.currency = config.get('currency', { infer: true });
  }

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.carts.findOneBy({ userId });
    const items = cart
      ? await this.cartItems.find({
          where: { cartId: cart.id },
          relations: { product: true, variant: true },
          withDeleted: true,
          order: { createdAt: 'ASC' },
        })
      : [];

    const priced = priceCart(items);
    return {
      id: cart?.id ?? null,
      userId,
      items: priced.lines.map(({ item, unitPriceMinor, lineTotalMinor, isAvailable }) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? 'Unknown product',
        variantId: item.variantId,
        variantName: item.variant?.name ?? 'Unknown variant',
        unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor,
        isAvailable,
      })),
      itemCount: priced.itemCount,
      totalAmountMinor: priced.totalAmountMinor,
      currency: this.currency,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    await this.productsService.getPurchasableVariant(dto.productId, dto.variantId);
    const cartId = await this.ensureCartId(userId);

    const rows: unknown[] = await this.dataSource.query(
      `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cart_id, variant_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()
       WHERE cart_items.quantity + EXCLUDED.quantity <= $5
       RETURNING id`,
      [cartId, dto.productId, dto.variantId, dto.quantity, MAX_ITEM_QUANTITY],
    );
    if (rows.length === 0) {
      throw new UnprocessableEntityException(`Maximum quantity per item is ${MAX_ITEM_QUANTITY}`);
    }
    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartResponseDto> {
    const item = await this.getOwnedItem(userId, itemId);
    await this.productsService.getPurchasableVariant(item.productId, item.variantId);
    await this.cartItems.update({ id: item.id }, { quantity: dto.quantity });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    const item = await this.getOwnedItem(userId, itemId);
    await this.cartItems.delete({ id: item.id });
    return this.getCart(userId);
  }

  async clear(userId: string): Promise<void> {
    const cart = await this.carts.findOneBy({ userId });
    if (cart) await this.cartItems.delete({ cartId: cart.id });
  }

  private async ensureCartId(userId: string): Promise<string> {
    const [row]: Array<{ id: string }> = await this.dataSource.query(
      `INSERT INTO carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [userId],
    );
    return row.id;
  }

  private async getOwnedItem(userId: string, itemId: string): Promise<CartItem> {
    const item = await this.cartItems
      .createQueryBuilder('item')
      .innerJoin('item.cart', 'cart', 'cart.userId = :userId', { userId })
      .where('item.id = :itemId', { itemId })
      .getOne();
    if (!item) throw new NotFoundException('Cart item not found');
    return item;
  }
}
