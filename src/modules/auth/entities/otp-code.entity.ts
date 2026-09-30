import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { IdentifierType } from '../../../common/utils/identifier.util';

export const UQ_OTP_CODES_IDENTIFIER = 'uq_otp_codes_identifier';

@Entity('otp_codes')
@Index(UQ_OTP_CODES_IDENTIFIER, ['identifierType', 'identifierValue'], { unique: true })
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  identifierType: IdentifierType;

  @Column({ type: 'varchar', length: 254 })
  identifierValue: string;

  @Column({ type: 'char', length: 64, nullable: true })
  codeHash: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz' })
  sentAt: Date;
}
