import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import './types/express';

// Importing routes
import userRoutes from './api/user/user.routes';
import authRoutes from './api/auth/auth.routes';
import projectRoutes from './api/projects/project.routes';
import AppError from './utils/AppError';
import globalErrorHandler from './utils/globalErrorHandler';
import { corsOptions } from './config/corsConfig';
import getEnv from './config/env';

const app = express();
const BASE_URL = '/api/v1';

// Middleware
app.use(cors(corsOptions)); // Enable CORS
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again in an hour',
  }),
);
if (getEnv('NODE_ENV') === 'development') {
  app.use(morgan('dev'));
}
app.use(cookieParser());
app.use(express.json());

// Routes
app.use(`${BASE_URL}/auth`, authRoutes);
app.use(`${BASE_URL}/users`, userRoutes);
app.use(`${BASE_URL}/projects`, projectRoutes); // Projects come first

// Error Handler
app.all(/.*/, (req, _, next) => {
  const safeUrl = encodeURI(req.originalUrl || 'unknown');
  next(new AppError(`Can't find ${safeUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;
