import express, { Express } from 'express';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import metaRoutes from './routes/meta.routes.js';

dotenv.config();

const app: Express = express();
const PORT = env.PORT;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/meta", metaRoutes);

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
