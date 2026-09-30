import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { configuration } from '../../config/configuration';
import { envValidationSchema } from '../../config/env.validation';
import { buildTypeOrmOptions } from './typeorm-options';

const { error, value } = envValidationSchema.validate(process.env, { allowUnknown: true });
if (error) throw new Error(`Invalid environment: ${error.message}`);
Object.assign(process.env, value);

export default new DataSource(buildTypeOrmOptions(configuration().db));
