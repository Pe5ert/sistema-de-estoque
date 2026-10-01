import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.url().refine((value) => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
  }, 'WEB_ORIGIN deve ser uma origem HTTP(S) sem caminho ou barra final.'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET deve conter ao menos 32 caracteres.'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export function validateEnv(input: Record<string, unknown>) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Configuração inválida: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
