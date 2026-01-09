import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Database seeding...');
  // Категории создаются автоматически при импорте банковских выписок
  // или вручную пользователем
  console.log('No system categories to seed - categories are created from bank statements.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
