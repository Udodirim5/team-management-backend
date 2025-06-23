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

const app = express();
app.set('trust proxy', 1); // Trust Railway/Vercel/etc
const BASE_URL = '/api/v1';

// ✅ CORS — allow local frontend
const allowedOrigin = 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true, // allow cookies/sessions
  })
);

// ✅ Handle preflight requests manually for extra safety
app.options('*', cors({ origin: allowedOrigin, credentials: true }));

// ✅ Log origin for debugging CORS issues
app.use((req, _res, next) => {
  console.log('🔍 Incoming Origin:', req.headers.origin);
  next();
});

// 🔐 Security + middlewares
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// ⚡ Rate limiter
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again in an hour',
  })
);

// 🚀 API Routes
app.use(`${BASE_URL}/auth`, authRoutes);
app.use(`${BASE_URL}/users`, userRoutes);
app.use(`${BASE_URL}/projects`, projectRoutes);

// 🧯 Error handling
app.all(/.*/, (req, _, next) => {
  const safeUrl = encodeURI(req.originalUrl || 'unknown');
  next(new AppError(`Can't find ${safeUrl} on this server`, 404));
});

app.use(globalErrorHandler);

export default app;
