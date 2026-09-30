import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/base.entity';
import { User } from '../../users/user.entity';
import { OrderStatus, PaymentType } from '../order.enums';
import { OrderItem } from './order-item.entity';

export const UQ_ORDERS_USER_IDEMPOTENCY_KEY = 'uq_orders_user_idempotency_key';

@Entity('orders')
@Index(UQ_ORDERS_USER_IDEMPOTENCY_KEY, ['userId', 'idempotencyKey'], { unique: true })
@Index('ix_orders_user_created', ['userId', 'createdAt'])
@Index('ix_orders_status_created', ['status', 'createdAt'])
@Check('ck_orders_total_non_negative', '"total_amount_minor" >= 0')
export class Order extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status', default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentType, enumName: 'payment_type' })
  paymentType: PaymentType;

  @Column({ type: 'integer' })
  totalAmountMinor: number;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 64 })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items: OrderItem[];
}
