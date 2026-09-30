import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { AppConfig } from '../config/configuration';
import { TypedConfigService } from '../config/typed-config';
import { BackgroundJob } from '../infrastructure/jobs/background-job.entity';
import { JobStatus, JobType } from '../infrastructure/jobs/job.types';
import { JobHandlers } from './job-handlers.service';

const MAX_BACKOFF_MS = 5 * 60_000;

@Injectable()
export class JobRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(JobRunner.name);
  private readonly settings: AppConfig['jobs'];
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopped = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly handlers: JobHandlers,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.settings = config.get('jobs', { infer: true });
  }

  onApplicationBootstrap(): void {
    if (this.settings.enabled) this.scheduleNext(0);
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  async runBatch(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const jobs = await manager
        .getRepository(BackgroundJob)
        .createQueryBuilder('job')
        .where('job.status = :pending', { pending: JobStatus.PENDING })
        .andWhere('job.runAt <= now()')
        .orderBy('job.runAt', 'ASC')
        .limit(this.settings.batchSize)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      for (const job of jobs) await this.runOne(manager, job);
      return jobs.length;
    });
  }

  private async runOne(manager: EntityManager, job: BackgroundJob): Promise<void> {
    const attempts = job.attempts + 1;

    if (job.expiresAt && job.expiresAt.getTime() <= Date.now()) {
      await this.finish(manager, job, {
        status: JobStatus.FAILED,
        attempts: job.attempts,
        lastError: 'Expired before it could run',
      });
      return;
    }

    try {
      await this.handlers.handle(job.type, job.payload);
      await this.finish(manager, job, { status: JobStatus.DONE, attempts, lastError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempts >= this.settings.maxAttempts) {
        this.logger.error(
          `Job ${job.id} (${job.type}) failed permanently after ${attempts} attempts: ${message}`,
        );
        await this.finish(manager, job, { status: JobStatus.FAILED, attempts, lastError: message });
        return;
      }
      const delayMs = Math.min(2 ** attempts * 1000, MAX_BACKOFF_MS);
      this.logger.warn(`Job ${job.id} (${job.type}) failed, retry ${attempts} in ${delayMs} ms: ${message}`);
      await manager.update(BackgroundJob, job.id, {
        attempts,
        lastError: message.slice(0, 1000),
        runAt: new Date(Date.now() + delayMs),
      });
    }
  }

  private async finish(
    manager: EntityManager,
    job: BackgroundJob,
    result: { status: JobStatus; attempts: number; lastError: string | null },
  ): Promise<void> {
    await manager.update(BackgroundJob, job.id, {
      ...result,
      lastError: result.lastError?.slice(0, 1000) ?? null,
      processedAt: new Date(),
    });
    if (job.type === JobType.SEND_NOTIFICATION) {
      await manager.query(`UPDATE background_jobs SET payload = payload - 'data' WHERE id = $1`, [job.id]);
    }
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    let picked = 0;
    try {
      picked = await this.runBatch();
    } catch (error) {
      this.logger.error('Job batch failed', error instanceof Error ? error.stack : error);
    } finally {
      this.running = false;
      this.scheduleNext(picked >= this.settings.batchSize ? 0 : this.settings.pollIntervalMs);
    }
  }
}
