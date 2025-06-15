import dotenv from 'dotenv';
dotenv.config();

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value ?? fallback!;
};

export default getEnv;
