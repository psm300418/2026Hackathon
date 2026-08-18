import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("skin-photos"),
  OPENAI_API_KEY: z.string().optional(),
  MFDS_INGREDIENTS_ENDPOINT: z
    .string()
    .url()
    .default("https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01"),
  MFDS_API_KEY: z.string().optional(),
  KMA_ASOS_ENDPOINT: z
    .string()
    .url()
    .default("https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php"),
  KMA_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
