import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAdminUserId() {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (adminUser) {
      console.log(adminUser.id);
    } else {
      console.log('No admin user found');
    }
  } catch (error) {
    console.error('Error getting admin user ID:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAdminUserId();
