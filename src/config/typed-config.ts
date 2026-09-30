import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

export type TypedConfigService = ConfigService<AppConfig, true>;
