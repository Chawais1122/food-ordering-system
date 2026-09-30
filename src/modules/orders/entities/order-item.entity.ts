import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
@Index('ix_order_items_order_id', ['orderId'])
@Check('ck_order_items_quantity_positive', '"quantity" > 0')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  variantId: string;

  @Column({ type: 'varchar', length: 150 })
  productName: string;

  @Column({ type: 'varchar', length: 80 })
  variantName: string;

  @Column({ type: 'integer' })
  unitPriceMinor: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'integer' })
  lineTotalMinor: number;
}
