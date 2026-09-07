import { z } from 'zod';

const configurationSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_PATH: z.string().min(1).default('./.data/gallery.db'),
  STORAGE_PATH: z.string().min(1).default('./.data/photos'),
  CORS_ORIGIN: z.string().url().default('http://localhost:4200'),
  SETUP_TOKEN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(32).optional(),
  ),
});

export type GalleryConfiguration = z.infer<typeof configurationSchema>;

export function validateConfiguration(
  environment: Record<string, unknown>,
): GalleryConfiguration {
  return configurationSchema.parse(environment);
}
