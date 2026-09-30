import { Check, Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/base.entity';
import { Product } from './product.entity';

export const UQ_VARIANTS_SKU = 'uq_product_variants_sku';
export const UQ_VARIANTS_PRODUCT_NAME = 'uq_product_variants_product_name';

@Entity('product_variants')
@Index(UQ_VARIANTS_SKU, ['sku'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(UQ_VARIANTS_PRODUCT_NAME, ['productId', 'name'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('ix_product_variants_product_id', ['productId'])
@Check('ck_product_variants_price_non_negative', '"price_minor" >= 0')
export class ProductVariant extends BaseEntity {
  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'integer' })
  priceMinor: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
