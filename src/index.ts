import express, { Express } from 'express';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.route.js';

dotenv.config();

const app: Express = express();
const PORT = env.PORT;

app.use(express.json());

app.use('/api/auth', authRoutes);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
