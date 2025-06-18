import express from 'express';
import './types/express';

// Importing routes
import userRoutes from './api/user/user.routes';
import authRoutes from './api/auth/auth.routes';
import projectRoutes from './api/projects/project.routes';
import AppError from './utils/AppError';
import globalErrorHandler from './utils/globalErrorHandler';

const app = express();
const BASE_URL = '/api/v1';

// Middleware
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
