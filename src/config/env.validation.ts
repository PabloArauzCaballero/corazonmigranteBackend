import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  APP_NAME: Joi.string().default('Corazon Migrante Backend'),
  CORS_ORIGINS: Joi.string().allow('').default('http://localhost:5173'),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_CONNECTION_TIMEOUT_MS: Joi.number().optional(),

  REDIS_URL: Joi.string().allow('').optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  OUTBOX_BATCH_SIZE: Joi.number().optional(),
  OUTBOX_INTERVAL_MS: Joi.number().optional(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: Joi.number().default(30),
  BCRYPT_ROUNDS: Joi.number().min(8).max(14).default(10),

  STORAGE_PROVIDER: Joi.string().valid('LOCAL', 'GCS').default('LOCAL'),
  UPLOAD_DIR: Joi.string().default('storage/uploads'),
  MAX_UPLOAD_MB: Joi.number().default(8),
  PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  FILE_SIGNED_URL_EXPIRES_SECONDS: Joi.number().min(60).max(86400).default(900),
  GCS_SIGNED_URL_TTL_SECONDS: Joi.number().min(60).max(86400).optional(),
  GCS_BUCKET: Joi.string().allow('').optional(),
  GCS_BUCKET_NAME_USER_MEDIA: Joi.string().allow('').optional(),
  GCS_BUCKET_NAME_PUBLIC_ASSETS: Joi.string().allow('').optional(),
  GCS_UPLOAD_PREFIX_USER_MEDIA: Joi.string().allow('').optional(),
  GCS_UPLOAD_PREFIX_PUBLIC_ASSETS: Joi.string().allow('').optional(),
  GCP_PROJECT_ID: Joi.string().allow('').optional(),
  GCS_PUBLIC_BASE_URL: Joi.string().uri().allow('').optional(),
  GOOGLE_APPLICATION_CREDENTIALS: Joi.string().allow('').optional(),
  GOOGLE_APPLICATION_CREDENTIALS_BASE64: Joi.string().allow('').optional(),
  GOOGLE_CREDENTIALS: Joi.string().allow('').optional(),
  GOOGLE_CREDENTIALS_JSON: Joi.string().allow('').optional(),
  GOOGLE_CREDENTIALS_BASE64: Joi.string().allow('').optional(),
  GOOGLE_SERVICE_ACCOUNT_BASE64: Joi.string().allow('').optional(),
  GCP_SERVICE_ACCOUNT_BASE64: Joi.string().allow('').optional(),

  EMAIL_PROVIDER: Joi.string().valid('DEV_NULL', 'SENDGRID').optional(),
  EMAIL_FROM_EMAIL: Joi.string().email().allow('').optional(),
  EMAIL_FROM_NAME: Joi.string().allow('').optional(),
  MAIL_PROVIDER: Joi.string().valid('DEV_NULL', 'SENDGRID').optional(),
  MAIL_FROM: Joi.string().email().allow('').optional(),
  MAIL_FROM_NAME: Joi.string().allow('').optional(),
  MAIL_REPLY_TO: Joi.string().email().allow('').optional(),
  SENDGRID_API_KEY: Joi.string().allow('').optional(),

  API_KEY: Joi.string().allow('').optional(),
  SOURCE_DATABASE_URL: Joi.string().allow('').optional(),
  NEON_BACKUP_DATABASE_URL: Joi.string().allow('').optional(),
  BACKUP_CONFIRM_REMOTE_NEON: Joi.boolean().optional(),
  BACKUP_REQUIRE_NEON_HOST: Joi.boolean().optional(),
  SMOKE_TEST_EMAIL: Joi.string().email().allow('').optional(),
}).custom((env, helpers) => {
  if (env.STORAGE_PROVIDER === 'GCS') {
    if (!env.GCS_BUCKET && !env.GCS_BUCKET_NAME_USER_MEDIA) {
      return helpers.error('any.custom', {
        message:
          'Debe configurar GCS_BUCKET o GCS_BUCKET_NAME_USER_MEDIA cuando STORAGE_PROVIDER=GCS.',
      });
    }

    if (
      !env.GOOGLE_CREDENTIALS_BASE64 &&
      !env.GOOGLE_CREDENTIALS_JSON &&
      !env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      return helpers.error('any.custom', {
        message:
          'Debe configurar GOOGLE_CREDENTIALS_BASE64 cuando STORAGE_PROVIDER=GCS. Recomendado: usar solo GOOGLE_CREDENTIALS_BASE64.',
      });
    }
  }

  const provider = env.EMAIL_PROVIDER ?? env.MAIL_PROVIDER ?? 'DEV_NULL';
  if (provider === 'SENDGRID') {
    const from = env.EMAIL_FROM_EMAIL ?? env.MAIL_FROM;
    if (!from)
      return helpers.error('any.custom', {
        message: 'Debe configurar EMAIL_FROM_EMAIL o MAIL_FROM cuando SendGrid está activo.',
      });
    if (!env.SENDGRID_API_KEY)
      return helpers.error('any.custom', {
        message: 'Debe configurar SENDGRID_API_KEY cuando SendGrid está activo.',
      });
  }
  return env;
});
