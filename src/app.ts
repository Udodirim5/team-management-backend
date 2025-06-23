import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import './types/express';
import userRoutes from './api/user/user.routes';
import authRoutes from './api/auth/auth.routes';
import projectRoutes from './api/projects/project.routes';
import AppError from './utils/AppError';
import globalErrorHandler from './utils/globalErrorHandler';

const app = express();
app.set('trust proxy', 1);

const BASE_URL = '/api/v1';

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://yourfrontenddomain.com',
];

// Enhanced CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

// Explicit OPTIONS handler
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Debugging middleware
app.use((req, _res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers
  });
  next();
});

// Security middlewares
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again in an hour',
  })
);

// Routes
app.use(`${BASE_URL}/auth`, authRoutes);
app.use(`${BASE_URL}/users`, userRoutes);
app.use(`${BASE_URL}/projects`, projectRoutes);

// 404 Handler
app.all(/.*/, (req, _, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Error handler
app.use(globalErrorHandler);

export default app;