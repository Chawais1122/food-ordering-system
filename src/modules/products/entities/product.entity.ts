import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/base.entity';
import { ProductVariant } from './product-variant.entity';

export const UQ_PRODUCTS_NAME = 'uq_products_name';

@Entity('products')
@Index(UQ_PRODUCTS_NAME, ['name'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('ix_products_category_active', ['category', 'isActive'])
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: ['insert'] })
  variants: ProductVariant[];
}
