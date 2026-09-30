import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
