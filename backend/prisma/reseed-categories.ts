import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Удаляем старые системные категории
  const deleted = await prisma.category.deleteMany({
    where: { isSystem: true }
  });
  console.log('Удалено системных категорий:', deleted.count);

  // Создаём новые с автогенерируемыми UUID
  const expenseCategories = [
    { name: 'Продукты', icon: '🛒' },
    { name: 'Транспорт', icon: '🚗' },
    { name: 'Жильё', icon: '🏠' },
    { name: 'Связь', icon: '📱' },
    { name: 'Здоровье', icon: '💊' },
    { name: 'Одежда', icon: '👕' },
    { name: 'Развлечения', icon: '🎮' },
    { name: 'Рестораны', icon: '🍽️' },
    { name: 'Подписки', icon: '📺' },
    { name: 'Образование', icon: '📚' },
    { name: 'Подарки', icon: '🎁' },
    { name: 'Другое', icon: '📦' },
  ];

  const incomeCategories = [
    { name: 'Зарплата', icon: '💰' },
    { name: 'Фриланс', icon: '💻' },
    { name: 'Инвестиции', icon: '📈' },
    { name: 'Подарки', icon: '🎁' },
    { name: 'Возврат', icon: '↩️' },
    { name: 'Другое', icon: '📦' },
  ];

  for (const cat of expenseCategories) {
    const created = await prisma.category.create({
      data: { name: cat.name, icon: cat.icon, type: 'EXPENSE', isSystem: true }
    });
    console.log(`Создана: ${cat.icon} ${cat.name} (${created.id})`);
  }

  for (const cat of incomeCategories) {
    const created = await prisma.category.create({
      data: { name: cat.name, icon: cat.icon, type: 'INCOME', isSystem: true }
    });
    console.log(`Создана: ${cat.icon} ${cat.name} (${created.id})`);
  }

  const count = await prisma.category.count({ where: { isSystem: true } });
  console.log(`\nВсего системных категорий: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
