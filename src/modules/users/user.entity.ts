import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../infrastructure/database/base.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { UserRole } from './user-role.enum';

export const UQ_USERS_EMAIL = 'uq_users_email';
export const UQ_USERS_PHONE = 'uq_users_phone';

@Entity('users')
@Index(UQ_USERS_EMAIL, ['email'], { unique: true })
@Index(UQ_USERS_PHONE, ['phone'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @Column({ type: 'varchar', length: 72, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role', default: UserRole.CUSTOMER })
  role: UserRole;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];
}
