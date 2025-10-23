import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Seed Probers
  const prober1 = await prisma.proberInstance.upsert({
    where: { id: 'clx2r0y2600013b6g3g3g3g3g' },
    update: {},
    create: {
      id: 'clx2r0y2600013b6g3g3g3g3g',
      name: 'Example Prober 1',
      address: 'http://localhost:9115',
      enabled: true,
    },
  });

  console.log(`Created prober with id: ${prober1.id}`);

  // Seed Targets
  const target1 = await prisma.blackboxTarget.upsert({
    where: { id: 'clx2r0y2600003b6g3g3g3g3g' },
    update: {},
    create: {
      id: 'clx2r0y2600003b6g3g3g3g3g',
      name: 'Example Target 1',
      url: 'http://example.com/target1',
      labels: 'example,target',
      enabled: true,
      module: 'http_2xx',
      userId: 'cmh2ynbuw0000j6i3btgt30tr',
    },
  });

  const target2 = await prisma.blackboxTarget.upsert({
    where: { id: 'clx2r0y2600023b6g3g3g3g3g' },
    update: {},
    create: {
      id: 'clx2r0y2600023b6g3g3g3g3g',
      name: 'Example Target 2',
      url: 'http://example.com/target2',
      labels: 'example,target',
      enabled: true,
      module: 'http_2xx',
      userId: 'cmh2ynbuw0000j6i3btgt30tr',
    },
  });

  console.log(`Created target with id: ${target1.id}`);
  console.log(`Created target with id: ${target2.id}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
