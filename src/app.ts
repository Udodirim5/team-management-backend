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
const allowedOrigins = ['http://localhost:5173', 'https://yourfrontenddomain.com'];

// Enhanced CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow Postman, curl, etc.
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// Preflight for all routes
app.options(
  '*',
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// Debugging middleware
app.use((req, _res, next) => {
  console.log('Incoming Request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers,
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
  }),
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

// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import morgan from 'morgan';
// import cookieParser from 'cookie-parser';
// import './types/express';
// // Importing routes
// import userRoutes from './api/user/user.routes';
// import authRoutes from './api/auth/auth.routes';
// import projectRoutes from './api/projects/project.routes';
// import AppError from './utils/AppError';
// import globalErrorHandler from './utils/globalErrorHandler';
// const app = express();
// app.set('trust proxy', 1); // Trust Railway/Vercel/etc
// const BASE_URL = '/api/v1';
// // ✅ CORS — allow local frontend
// const allowedOrigins = [
//   'http://localhost:5173', // dev
//   'https://yourfrontenddomain.com', // prod
// ];
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error(`Blocked by CORS: ${origin}`));
//       }
//     },
//     credentials: true,
//   }),
// );
// // ✅ Handle preflight requests manually for extra safety
// app.options('*', cors({ origin: allowedOrigins, credentials: true }));
// // ✅ Log origin for debugging CORS issues
// app.use((req, _res, next) => {
//   console.log('🔍 Incoming Origin:', req.headers.origin);
//   next();
// });
// // 🔐 Security + middlewares
// app.use(helmet());
// app.use(express.json());
// app.use(cookieParser());
// app.use(morgan('dev'));
// // ⚡ Rate limiter
// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 1000,
//     message: 'Too many requests from this IP, please try again in an hour',
//   }),
// );
// // 🚀 API Routes
// app.use(`${BASE_URL}/auth`, authRoutes);
// app.use(`${BASE_URL}/users`, userRoutes);
// app.use(`${BASE_URL}/projects`, projectRoutes);
// // 🧯 Error handling
// app.all(/.*/, (req, _, next) => {
//   const safeUrl = encodeURI(req.originalUrl || 'unknown');
//   next(new AppError(`Can't find ${safeUrl} on this server`, 404));
// });
// app.use(globalErrorHandler);
// export default app;
