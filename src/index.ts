import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app: Express = express();

const PORT = env.PORT;

app.get('/', (req: Request, res: Response) => {
    res.send('Successful!');
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
