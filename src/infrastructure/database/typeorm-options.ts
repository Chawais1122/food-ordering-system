import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { AppConfig } from '../../config/configuration';
import { ENTITIES } from './entities';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export const buildTypeOrmOptions = (db: AppConfig['db']): DataSourceOptions => ({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.user,
  password: db.password,
  database: db.name,
  ssl: db.ssl ? { rejectUnauthorized: true } : false,
  logging: db.logging,
  uuidExtension: 'pgcrypto',
  namingStrategy: new SnakeNamingStrategy(),
  entities: ENTITIES,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  migrationsRun: false,
  extra: {
    max: db.poolSize,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
  },
});
