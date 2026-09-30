import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';
import { TypedConfigService } from './config/typed-config';
import { setupSwagger } from './swagger';

const logger = new Logger('Bootstrap');

async function startServer(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);

  const config = app.get<TypedConfigService>(ConfigService);
  if (config.get('swaggerEnabled', { infer: true })) setupSwagger(app);

  const port = config.get('port', { infer: true });
  await app.listen(port);
  logger.log(`API listening on: ${port}/${API_PREFIX}`);
}

function bootstrap(): void {
  const requested = Number.parseInt(process.env.CLUSTER_WORKERS ?? '0', 10) || 0;
  const workers = Math.min(requested, availableParallelism());

  if (workers > 0 && cluster.isPrimary) {
    logger.log(`Primary ${process.pid} forking ${workers} workers`);
    for (let i = 0; i < workers; i += 1) cluster.fork();
    cluster.on('exit', (worker, code, signal) => {
      if (signal === 'SIGTERM' || code === 0) return;
      logger.warn(`Worker ${worker.process.pid} died (${signal ?? code}); restarting`);
      cluster.fork();
    });
    return;
  }

  startServer().catch((error: Error) => {
    logger.error(`Failed to start: ${error.message}`, error.stack);
    process.exit(1);
  });
}

bootstrap();
