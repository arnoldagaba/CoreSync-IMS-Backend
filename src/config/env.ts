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

  // NODE_ENV validation: Ensures it's one of the allowed values
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Email configuration validation
  EMAIL_FROM: z.string().email('Email from address must be valid'),

  EMAIL_HOST: z.string().min(1, 'Email host is required'),

  EMAIL_PORT: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().default(587)
  ),

  EMAIL_SECURE: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),

  EMAIL_USER: z.string().min(1, 'Email user is required'),

  EMAIL_PASSWORD: z.string().min(1, 'Email password is required'),

  // FRONTEND_URL validation: Ensures it's a valid URL
  FRONTEND_URL: z
    .string()
    .url('Frontend URL must be a valid URL')
    .default('http://localhost:5173'),
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
