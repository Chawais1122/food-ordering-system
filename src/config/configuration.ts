export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  corsOrigins: string[];
  clusterWorkers: number;
  swaggerEnabled: boolean;
  currency: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    poolSize: number;
    ssl: boolean;
    logging: boolean;
  };
  auth: {
    apiKey: string;
    accessSecret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
    bcryptRounds: number;
  };
  otp: {
    hashSecret: string;
    ttlSeconds: number;
    length: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
  };
  notifications: {
    smtp: {
      host?: string;
      port: number;
      secure: boolean;
      user?: string;
      password?: string;
      from?: string;
    };
    twilio: {
      accountSid?: string;
      authToken?: string;
      fromNumber?: string;
    };
  };
  throttle: { ttlMs: number; limit: number; authLimit: number };
  jobs: { enabled: boolean; pollIntervalMs: number; batchSize: number; maxAttempts: number };
}

const bool = (value: string | undefined): boolean => value === 'true' || value === '1';
const optional = (value: string | undefined): string | undefined => value?.trim() || undefined;
const int = (value: string | undefined, fallback: number): number =>
  value === undefined || value === '' ? fallback : Number.parseInt(value, 10);

export const configuration = (): AppConfig => {
  const env = process.env;
  return {
    nodeEnv: (env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
    port: int(env.PORT, 3000),
    corsOrigins: (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    clusterWorkers: int(env.CLUSTER_WORKERS, 0),
    swaggerEnabled: env.SWAGGER_ENABLED === undefined ? true : bool(env.SWAGGER_ENABLED),
    currency: env.CURRENCY ?? 'USD',
    db: {
      host: env.DB_HOST as string,
      port: int(env.DB_PORT, 5432),
      user: env.DB_USER as string,
      password: env.DB_PASSWORD as string,
      name: env.DB_NAME as string,
      poolSize: int(env.DB_POOL_SIZE, 20),
      ssl: bool(env.DB_SSL),
      logging: bool(env.DB_LOGGING),
    },
    auth: {
      apiKey: env.API_KEY as string,
      accessSecret: env.JWT_ACCESS_SECRET as string,
      accessTtlSeconds: int(env.JWT_ACCESS_TTL_SECONDS, 900),
      refreshTtlDays: int(env.REFRESH_TOKEN_TTL_DAYS, 7),
      bcryptRounds: int(env.BCRYPT_ROUNDS, 12),
    },
    otp: {
      hashSecret: env.OTP_HASH_SECRET as string,
      ttlSeconds: int(env.OTP_TTL_SECONDS, 300),
      length: int(env.OTP_LENGTH, 6),
      maxAttempts: int(env.OTP_MAX_ATTEMPTS, 5),
      resendCooldownSeconds: int(env.OTP_RESEND_COOLDOWN_SECONDS, 60),
    },
    notifications: {
      smtp: {
        host: optional(env.SMTP_HOST),
        port: int(env.SMTP_PORT, 587),
        secure: bool(env.SMTP_SECURE),
        user: optional(env.SMTP_USER),
        password: optional(env.SMTP_PASSWORD),
        from: optional(env.SMTP_FROM),
      },
      twilio: {
        accountSid: optional(env.TWILIO_ACCOUNT_SID),
        authToken: optional(env.TWILIO_AUTH_TOKEN),
        fromNumber: optional(env.TWILIO_FROM_NUMBER),
      },
    },
    throttle: {
      ttlMs: int(env.THROTTLE_TTL_MS, 60_000),
      limit: int(env.THROTTLE_LIMIT, 120),
      authLimit: int(env.AUTH_THROTTLE_LIMIT, 10),
    },
    jobs: {
      enabled: env.JOBS_ENABLED === undefined ? true : bool(env.JOBS_ENABLED),
      pollIntervalMs: int(env.JOBS_POLL_INTERVAL_MS, 1000),
      batchSize: int(env.JOBS_BATCH_SIZE, 20),
      maxAttempts: int(env.JOBS_MAX_ATTEMPTS, 5),
    },
  };
};
