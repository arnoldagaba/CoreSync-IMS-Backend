import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

// Configure dotenv to load environment variables from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define the shape of our environment variables using Zod schema
type EnvType = z.infer<typeof envSchema>;

const envSchema = z.object({
  // PORT validation: Converts empty strings to undefined and falls back to 3000
  // This helps handle cases where PORT might not be set or might be empty
  PORT: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().default(3000)
  ),

  // DATABASE_URL validation: Ensures we have a valid connection string
  // The min(1) check ensures we don't accept empty strings
  DATABASE_URL: z
    .string()
    .min(1, 'Database URL is required')
    .refine(
      (url) => url.startsWith('mysql://'),
      'Database URL must be a valid MySQL connection string'
    ),

  // JWT_SECRET validation: Ensures we have a strong secret key
  // We require at least 32 characters for security
  JWT_SECRET: z
    .string()
    .min(32, 'JWT secret must be at least 32 characters long'),
});

const validateEnv = (): EnvType => {
  // Attempt to validate all environment variables at once
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // If validation fails, provide detailed error information
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    // Exit the process if environment validation fails
    // This prevents the application from starting with invalid configuration
    process.exit(1);
  }

  return result.data;
};

export const env = validateEnv();
