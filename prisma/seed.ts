import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Users
  const user1 = await prisma.user.create({
    data: {
      email: 'wisdom@email.com',
      password: 'password123',
      name: 'Alice Dev',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'wisdom2@email.com',
      password: 'password123',
      name: 'Bob Dev',
    },
  });

  // Project
  const project = await prisma.project.create({
    data: {
      name: 'Task Tracker Alpha',
      description: 'Demo project seeded from script',
      creatorId: user1.id,
    },
  });

  // Memberships
  await prisma.membership.createMany({
    data: [
      {
        userId: user1.id,
        projectId: project.id,
        role: Role.OWNER,
      },
      {
        userId: user2.id,
        projectId: project.id,
        role: Role.MEMBER,
      },
    ],
  });

  // Tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Initial Setup',
        description: 'Set up repo and environment',
        status: 'DONE',
        priority: 'MEDIUM',
        projectId: project.id,
        createdById: user1.id,
        assignedToId: user1.id,
      },
      {
        title: 'Design Wireframes',
        description: 'Create low-fidelity wireframes',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project.id,
        createdById: user1.id,
        assignedToId: user2.id,
      },
      {
        title: 'Database Schema',
        description: 'Design Prisma schema',
        status: 'TODO',
        priority: 'LOW',
        projectId: project.id,
        createdById: user1.id,
        assignedToId: null,
      },
    ],
  });

  console.log('🌱 Seeded: 2 users, 1 project, 3 tasks');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
