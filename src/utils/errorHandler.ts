import { Response } from 'express';

export const handleError = (
  res: Response,
  error: unknown,
  message = 'Internal Server Error',
  status = 500
) => {
  console.error('💥 Error:', error);
  return res.status(status).json({ message });
};
