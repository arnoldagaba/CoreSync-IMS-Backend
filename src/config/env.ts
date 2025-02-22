import { z } from 'zod';

const envSchema = z.object({
    PORT: z.preprocess((a) => Number(a), z.number().default(3000)),
    DATABASE_URL: z.string(),
});

const validateEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Invalid environment variables:', error.errors);
            process.exit(1);
        }
    }
};

export const env = validateEnv();
