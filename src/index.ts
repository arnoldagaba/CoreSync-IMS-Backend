import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import metaRoutes from './routes/meta.routes.js';

dotenv.config();

const app: Express = express();
const PORT = env.PORT;

// Enable CORS for all origins (for development, not recommended for production)
// app.use(cors());

// Enable CORS for specific origin (recommended)
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true, // if you send cookies or authentication headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // if you use other methods
    allowedHeaders: ['Content-Type', 'Authorization'], // if you use custom headers
  })
);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Perform user actions (CRUD)
app.use('/api/meta', metaRoutes); // Obtain roles and departments

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
