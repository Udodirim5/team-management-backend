import { CorsOptions } from 'cors';
import getEnv from './env';

const devOrigins = [
  'http://localhost:3000',    // Web (React)
  'http://localhost:5173',    // Vite dev
  'http://localhost:19006',   // React Native (Expo dev)
  'http://127.0.0.1:19006',   // React Native (iOS dev)
];

const prodOrigins = [
  'https://yourapp.com',        // your actual prod domain
  'https://mobile.yourapp.com', // mobile prod domain
  'http://localhost:5173',      // 👈 ADD this for local frontend testing
];

const allowlist = getEnv('NODE_ENV') === 'production' ? prodOrigins : devOrigins;

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl or mobile apps)
    if (!origin || allowlist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
