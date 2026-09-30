import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/base.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Product } from '../../products/entities/product.entity';
import { Cart } from './cart.entity';

export const MAX_ITEM_QUANTITY = 99;

@Entity('cart_items')
@Index('uq_cart_items_cart_variant', ['cartId', 'variantId'], { unique: true })
@Index('ix_cart_items_variant_id', ['variantId'])
@Check('ck_cart_items_quantity', `"quantity" BETWEEN 1 AND ${MAX_ITEM_QUANTITY}`)
export class CartItem extends BaseEntity {
  @Column({ type: 'uuid' })
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid' })
  variantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column({ type: 'integer' })
  quantity: number;
}
