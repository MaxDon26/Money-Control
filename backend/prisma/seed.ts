import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const expenseCategories = [
  { name: 'Продукты', icon: 'shopping-cart' },
  { name: 'Транспорт', icon: 'car' },
  { name: 'Жильё', icon: 'home' },
  { name: 'Связь', icon: 'phone' },
  { name: 'Здоровье', icon: 'heart' },
  { name: 'Одежда', icon: 'skin' },
  { name: 'Развлечения', icon: 'smile' },
  { name: 'Рестораны', icon: 'coffee' },
  { name: 'Подписки', icon: 'credit-card' },
  { name: 'Образование', icon: 'book' },
  { name: 'Подарки', icon: 'gift' },
  { name: 'Другое', icon: 'ellipsis' },
];

const incomeCategories = [
  { name: 'Зарплата', icon: 'dollar' },
  { name: 'Фриланс', icon: 'laptop' },
  { name: 'Инвестиции', icon: 'rise' },
  { name: 'Подарки', icon: 'gift' },
  { name: 'Возврат', icon: 'rollback' },
  { name: 'Другое', icon: 'ellipsis' },
];

async function main() {
  console.log('Seeding database...');

  // Создаём системные категории расходов
  for (const cat of expenseCategories) {
    const id = `system-expense-${cat.name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: cat.name,
        icon: cat.icon,
        type: 'EXPENSE',
        isSystem: true,
      },
    });
    console.log(`Created expense category: ${cat.name}`);
  }

  // Создаём системные категории доходов
  for (const cat of incomeCategories) {
    const id = `system-income-${cat.name.toLowerCase().replace(/\s+/g, '-')}`;
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: cat.name,
        icon: cat.icon,
        type: 'INCOME',
        isSystem: true,
      },
    });
    console.log(`Created income category: ${cat.name}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
