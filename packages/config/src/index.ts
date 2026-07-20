import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(24),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_PORT: z.coerce.number().int().positive().default(4000)
});

export type RuntimeEnv = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv): RuntimeEnv {
  return envSchema.parse(env);
}
