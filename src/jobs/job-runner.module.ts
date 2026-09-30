import { Module } from '@nestjs/common';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { UsersModule } from '../modules/users/users.module';
import { JobHandlers } from './job-handlers.service';
import { JobRunner } from './job-runner.service';

@Module({
  imports: [UsersModule, NotificationsModule],
  providers: [JobRunner, JobHandlers],
})
export class JobRunnerModule {}
