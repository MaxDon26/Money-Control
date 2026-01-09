import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Удаляем старые системные категории (миграция на новую систему)
  const deleted = await prisma.category.deleteMany({
    where: { isSystem: true }
  });
  console.log('Удалено системных категорий:', deleted.count);
  console.log('\nКатегории теперь создаются автоматически при импорте банковских выписок.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
