import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txCount = await prisma.transaction.count();
  console.log('Транзакций:', txCount);

  const accounts = await prisma.account.findMany({
    select: { name: true, balance: true },
  });
  console.log('Счета:', accounts);
}

main().finally(() => prisma.$disconnect());
