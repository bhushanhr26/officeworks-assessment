import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

/** Optional string where an empty value (e.g. `SMTP_USER=` in .env) means "not set". */
const optionalString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    /** Number of reverse proxies in front of the API (e.g. 1 behind an ALB). Used for client IPs. */
    /** Comma-separated exact origins allowed by CORS, e.g. the web app's URL. */
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((v) =>
        v
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().url()).min(1, 'At least one CORS origin is required')),
    TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),

    /** Optional override; the adapter has its own default. */
    FAKESTORE_BASE_URL: optionalString(z.string().url()),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    PRODUCT_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(300_000),
    /** Resolved against the API's working directory. */
    FEATURED_CONFIG_PATH: z.string().min(1).default('config/featured.json'),

    // Email. The defaults target Mailpit on localhost. Recipients have no default, on purpose.
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    SMTP_SECURE: booleanString,
    /** Require STARTTLS. Set true for any real provider (e.g. SES on 587); Mailpit has no TLS. */
    SMTP_REQUIRE_TLS: booleanString,
    SMTP_USER: optionalString(z.string().min(1)),
    SMTP_PASS: optionalString(z.string().min(1)),
    SALES_INBOX: z.string().email(),
    /** e.g. "Catalogue <no-reply@example.com>" */
    MAIL_FROM: z.string().min(3),

    ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    ENQUIRY_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60_000),
  })
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS), {
    message: 'SMTP_USER and SMTP_PASS must be set together',
    path: ['SMTP_USER'],
  });

export type Config = z.infer<typeof EnvSchema>;

/** Loads ./.env into process.env if present. Real env vars (Docker, ECS) take precedence. */
export function loadDotEnv(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

// The only place process.env is read (CLAUDE.md hard constraint 7).
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${issues}`);
  }
  return result.data;
}
