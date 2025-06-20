import { PrismaClient } from '@prisma/client';
import getEnv from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: getEnv('NODE_ENV') === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (getEnv('NODE_ENV') !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Optional: Add cleanup for Node process termination
process.on('beforeExit', async () => {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
});

export default prisma;
