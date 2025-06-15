import express from 'express';
import './types/express';

// Importing routes
import userRoutes from './api/user/user.routes';
import authRoutes from './api/auth/auth.routes';
import projectRoutes from './api/projects/project.routes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);

export default app;
