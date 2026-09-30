import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../infrastructure/database/base.entity';
import { User } from '../../users/user.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
@Index('uq_carts_user_id', ['userId'], { unique: true })
export class Cart extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CartItem, (item) => item.cart)
  items: CartItem[];
}
