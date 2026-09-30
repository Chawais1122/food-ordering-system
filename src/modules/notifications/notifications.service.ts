import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EnqueueOptions, JobsService } from '../../infrastructure/jobs/jobs.service';
import { JobType } from '../../infrastructure/jobs/job.types';
import { NotificationRequest } from './notification.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly jobs: JobsService) {}

  enqueue(manager: EntityManager, request: NotificationRequest, options?: EnqueueOptions): Promise<void> {
    return this.jobs.enqueue(manager, JobType.SEND_NOTIFICATION, request, options);
  }
}
