import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Категории расходов из банковских выписок (Сбербанк)
const EXPENSE_CATEGORIES = [
  { name: 'Супермаркеты', icon: '🛒' },
  { name: 'Рестораны и кафе', icon: '🍽️' },
  { name: 'Транспорт', icon: '🚌' },
  { name: 'Автомобиль', icon: '🚗' },
  { name: 'Связь и телеком', icon: '📱' },
  { name: 'Здоровье и красота', icon: '💊' },
  { name: 'Одежда и аксессуары', icon: '👕' },
  { name: 'Отдых и развлечения', icon: '🎮' },
  { name: 'Все для дома', icon: '🏠' },
  { name: 'ЖКХ', icon: '💡' },
  { name: 'Образование', icon: '📚' },
  { name: 'Выдача наличных', icon: '💵' },
  { name: 'Прочие расходы', icon: '📦' },
];

// Категории доходов / переводов
const INCOME_CATEGORIES = [
  { name: 'Перевод СБП', icon: '💸' },
  { name: 'Перевод на карту', icon: '💳' },
  { name: 'Другое', icon: '📥' },
];

async function main() {
  console.log('=== Миграция на категории из банковских выписок ===\n');

  // 1. Получаем все системные категории
  const systemCategories = await prisma.category.findMany({
    where: { isSystem: true },
  });
  console.log(`Найдено системных категорий: ${systemCategories.length}`);

  // 2. Получаем всех пользователей
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  console.log(`Найдено пользователей: ${users.length}`);

  // 3. Для каждого пользователя
  for (const user of users) {
    console.log(`\nОбрабатываю ${user.email}...`);

    // Создаём маппинг: старая системная категория -> новая пользовательская
    const categoryMapping = new Map<string, string>(); // oldId -> newId

    // Создаём категории расходов
    for (const { name, icon } of EXPENSE_CATEGORIES) {
      // Проверяем, нет ли уже такой категории у пользователя
      let category = await prisma.category.findFirst({
        where: { userId: user.id, name, type: 'EXPENSE' },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            userId: user.id,
            name,
            icon,
            type: 'EXPENSE',
            isSystem: false,
          },
        });
      }

      // Ищем системную категорию с похожим названием для маппинга
      const systemCat = systemCategories.find(
        (sc) => sc.type === 'EXPENSE' && sc.name.toLowerCase() === name.toLowerCase()
      );
      if (systemCat) {
        categoryMapping.set(systemCat.id, category.id);
      }
    }

    // Создаём категории доходов
    for (const { name, icon } of INCOME_CATEGORIES) {
      let category = await prisma.category.findFirst({
        where: { userId: user.id, name, type: 'INCOME' },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            userId: user.id,
            name,
            icon,
            type: 'INCOME',
            isSystem: false,
          },
        });
      }

      const systemCat = systemCategories.find(
        (sc) => sc.type === 'INCOME' && sc.name.toLowerCase() === name.toLowerCase()
      );
      if (systemCat) {
        categoryMapping.set(systemCat.id, category.id);
      }
    }

    // Создаём категорию "Другое" для расходов (для тех, что не смапились)
    let otherExpense = await prisma.category.findFirst({
      where: { userId: user.id, name: 'Прочие расходы', type: 'EXPENSE' },
    });
    if (!otherExpense) {
      otherExpense = await prisma.category.create({
        data: {
          userId: user.id,
          name: 'Прочие расходы',
          icon: '📦',
          type: 'EXPENSE',
          isSystem: false,
        },
      });
    }

    let otherIncome = await prisma.category.findFirst({
      where: { userId: user.id, name: 'Другое', type: 'INCOME' },
    });
    if (!otherIncome) {
      otherIncome = await prisma.category.create({
        data: {
          userId: user.id,
          name: 'Другое',
          icon: '📥',
          type: 'INCOME',
          isSystem: false,
        },
      });
    }

    // Обновляем транзакции пользователя с системными категориями
    const userTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        category: { isSystem: true },
      },
      include: { category: true },
    });

    console.log(`  Транзакций с системными категориями: ${userTransactions.length}`);

    for (const tx of userTransactions) {
      let newCategoryId = categoryMapping.get(tx.categoryId);

      if (!newCategoryId) {
        // Не нашли маппинг - используем "Другое"
        newCategoryId = tx.type === 'EXPENSE' ? otherExpense.id : otherIncome.id;
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: { categoryId: newCategoryId },
      });
    }

    console.log(`  Категории созданы и транзакции обновлены`);
  }

  // 4. Теперь удаляем системные категории (они больше не используются)
  const deletedSystem = await prisma.category.deleteMany({
    where: { isSystem: true },
  });
  console.log(`\nУдалено системных категорий: ${deletedSystem.count}`);

  // 5. Итоги
  const totalCategories = await prisma.category.count();
  console.log(`\n=== Готово ===`);
  console.log(`Всего категорий в базе: ${totalCategories}`);
}

main()
  .catch((e) => {
    console.error('Ошибка:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
