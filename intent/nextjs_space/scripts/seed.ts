import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('johndoe123', 10);
  const reviewerPassword = await bcrypt.hash('reviewer123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Admin user (test account)
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Admin user (visible)
  await prisma.user.upsert({
    where: { email: 'admin@flow.com' },
    update: {},
    create: {
      email: 'admin@flow.com',
      name: 'Sarah Chen',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  });

  // Reviewer
  await prisma.user.upsert({
    where: { email: 'reviewer@flow.com' },
    update: {},
    create: {
      email: 'reviewer@flow.com',
      name: 'Marcus Rivera',
      password: reviewerPassword,
      role: 'REVIEWER',
    },
  });

  // End User
  await prisma.user.upsert({
    where: { email: 'user@flow.com' },
    update: {},
    create: {
      email: 'user@flow.com',
      name: 'Alex Johnson',
      password: userPassword,
      role: 'END_USER',
    },
  });

  console.log('Seeded users successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
