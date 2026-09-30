import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { JobPayloads, JobType } from './job.types';

export interface EnqueueOptions {
  expiresInMs?: number;
}

@Injectable()
export class JobsService {
  async enqueue<T extends JobType>(
    manager: EntityManager,
    type: T,
    payload: JobPayloads[T],
    options: EnqueueOptions = {},
  ): Promise<void> {
    const expiresAt = options.expiresInMs ? new Date(Date.now() + options.expiresInMs) : null;
    await manager.query(`INSERT INTO background_jobs (type, payload, expires_at) VALUES ($1, $2, $3)`, [
      type,
      JSON.stringify(payload),
      expiresAt,
    ]);
  }
}
