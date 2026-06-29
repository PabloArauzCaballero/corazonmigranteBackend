function parseRedisUrl() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return {};
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  } catch {
    return {};
  }
}

function parseGoogleCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    return JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8'));
  }
  return undefined;
}

export default () => {
  const redisFromUrl = parseRedisUrl();
  const emailProvider = process.env.EMAIL_PROVIDER ?? process.env.MAIL_PROVIDER ?? 'DEV_NULL';
  const fromEmail = process.env.EMAIL_FROM_EMAIL ?? process.env.MAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME ?? process.env.MAIL_FROM_NAME ?? 'Corazón Migrante';
  const gcsBucket = process.env.GCS_BUCKET ?? process.env.GCS_BUCKET_NAME_USER_MEDIA;
  const signedUrlExpiresSeconds = Number(
    process.env.FILE_SIGNED_URL_EXPIRES_SECONDS ?? process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 900,
  );

  return {
    app: {
      port: Number(process.env.PORT ?? 3000),
      apiPrefix: process.env.API_PREFIX ?? 'api/v1',
      name: process.env.APP_NAME ?? 'Corazon Migrante Backend',
      corsOrigins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    },
    database: {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT ?? 5432),
      name: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true',
      logging: process.env.DATABASE_LOGGING === 'true',
      connectionTimeoutMs: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 20000),
    },
    redis: {
      host: process.env.REDIS_HOST ?? redisFromUrl.host ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? redisFromUrl.port ?? 6379),
      password: process.env.REDIS_PASSWORD || redisFromUrl.password || undefined,
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 30),
    },
    security: {
      bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    },
    files: {
      storageProvider: process.env.STORAGE_PROVIDER ?? 'LOCAL',
      uploadDir: process.env.UPLOAD_DIR ?? 'storage/uploads',
      maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 8),
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
      signedUrlExpiresSeconds,
      gcs: {
        bucket: gcsBucket,
        projectId: process.env.GCP_PROJECT_ID,
        publicBaseUrl: process.env.GCS_PUBLIC_BASE_URL,
        credentials: parseGoogleCredentials(),
        userMediaPrefix: process.env.GCS_UPLOAD_PREFIX_USER_MEDIA ?? 'users',
        publicAssetsPrefix: process.env.GCS_UPLOAD_PREFIX_PUBLIC_ASSETS ?? 'public',
      },
    },
    email: {
      provider: emailProvider,
      fromEmail,
      fromName,
      replyTo: process.env.MAIL_REPLY_TO,
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
      },
    },
  };
};
