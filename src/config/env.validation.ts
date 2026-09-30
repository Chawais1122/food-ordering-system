import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGINS: Joi.string().allow('').default(''),
  CLUSTER_WORKERS: Joi.number().integer().min(0).default(0),
  SWAGGER_ENABLED: Joi.boolean().default(true),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_POOL_SIZE: Joi.number().integer().min(1).default(20),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  API_KEY: Joi.string().min(32).required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(7),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),

  OTP_HASH_SECRET: Joi.string().min(32).required(),
  OTP_TTL_SECONDS: Joi.number().integer().min(30).default(300),
  OTP_LENGTH: Joi.number().integer().min(4).max(10).default(6),
  OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: Joi.number().integer().min(0).default(60),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().empty('').default(587),
  SMTP_SECURE: Joi.boolean().empty('').default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.when('SMTP_HOST', {
    is: Joi.string().min(1),
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),

  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.when('TWILIO_ACCOUNT_SID', {
    is: Joi.string().min(1),
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  TWILIO_FROM_NUMBER: Joi.when('TWILIO_ACCOUNT_SID', {
    is: Joi.string().min(1),
    then: Joi.string()
      .pattern(/^\+[1-9]\d{6,14}$/)
      .required(),
    otherwise: Joi.string().allow('').default(''),
  }),

  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(120),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().min(1).default(10),

  CURRENCY: Joi.string().length(3).uppercase().default('USD'),

  JOBS_ENABLED: Joi.boolean().default(true),
  JOBS_POLL_INTERVAL_MS: Joi.number().integer().min(100).default(1000),
  JOBS_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(20),
  JOBS_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
});
