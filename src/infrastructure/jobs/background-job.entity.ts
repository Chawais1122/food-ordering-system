import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { JobPayload, JobStatus, JobType } from './job.types';

@Entity('background_jobs')
@Index('ix_background_jobs_due', ['runAt'], { where: `"status" = 'PENDING'` })
export class BackgroundJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  type: JobType;

  @Column({ type: 'jsonb' })
  payload: JobPayload;

  @Column({ type: 'varchar', length: 16, default: JobStatus.PENDING })
  status: JobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  runAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
