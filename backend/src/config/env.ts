import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  // Comma-separated list of origins allowed to call the API (the dashboard's URL).
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  // Path to the Firebase service-account JSON. Optional while developing with AUTH_DEV_BYPASS.
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  // Lets you call the API without Firebase by sending an `x-dev-user` header.
  // Ignored when NODE_ENV=production.
  AUTH_DEV_BYPASS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export const env = EnvSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
