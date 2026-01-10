import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  for (const user of users) {
    const existing = await prisma.category.findFirst({
      where: { userId: user.id, name: 'Кредиты и займы' }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: 'Кредиты и займы',
          type: 'EXPENSE',
          icon: '🏦',
          isSystem: false,
        }
      });
      console.log(`✅ Добавлена категория "Кредиты и займы" для ${user.email}`);
    } else {
      console.log(`⏭️ Категория уже существует для ${user.email}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
