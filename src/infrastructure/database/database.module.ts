import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TypedConfigService } from '../../config/typed-config';
import { buildTypeOrmOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: TypedConfigService) => buildTypeOrmOptions(config.get('db', { infer: true })),
    }),
  ],
})
export class DatabaseModule {}
