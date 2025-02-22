import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type EnvType = z.infer<typeof envSchema>;

const envSchema = z.object({
    PORT: z.preprocess(
        (val) => (val === '' ? undefined : Number(val)),
        z.number().default(3000)
    ), // Default port is 3000
    DATABASE_URL: z.string().min(1, 'Database URL is required'),
});

const validateEnv = (): EnvType => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
};

export const env = validateEnv();
