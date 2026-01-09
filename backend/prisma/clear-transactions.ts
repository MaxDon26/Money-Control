import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Удаление всех транзакций ===\n');

  const count = await prisma.transaction.count();
  console.log(`Транзакций в базе: ${count}`);

  const deleted = await prisma.transaction.deleteMany({});
  console.log(`Удалено: ${deleted.count}`);

  // Сбросить балансы счетов на 0
  const updated = await prisma.account.updateMany({
    data: { balance: 0 },
  });
  console.log(`Счетов обновлено: ${updated.count}`);

  console.log('\n=== Готово ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
