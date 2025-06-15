import getEnv from './config/env';
import app from './app';

const PORT = Number(getEnv('PORT', '5000'));

if (isNaN(PORT)) {
  console.error('Invalid PORT number in .env file');
  process.exit(1);
}
app.listen(PORT, () => {
  console.log(`🚀 Server is running on ${PORT}`);
});
