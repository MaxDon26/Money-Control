import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Иконки для категорий
const ICONS: Record<string, string> = {
  'Супермаркеты': '🛒',
  'Рестораны и кафе': '🍽️',
  'Транспорт': '🚌',
  'Автомобиль': '🚗',
  'Связь и телеком': '📱',
  'Здоровье и красота': '💊',
  'Одежда и аксессуары': '👕',
  'Отдых и развлечения': '🎮',
  'Все для дома': '🏠',
  'ЖКХ': '💡',
  'Образование': '📚',
  'Выдача наличных': '💵',
  'Прочие расходы': '📦',
  'Перевод СБП': '💸',
  'Перевод на карту': '💳',
  'Перевод с карты': '💳',
  'Другое': '📥',
  'Оплата по QR–коду СБП': '📲',
  'Оплата по QR-коду СБП': '📲',
};

// Категории для объединения: source -> target
const MERGE_MAP: Record<string, string> = {
  'Прочие операции': 'Прочие расходы', // для EXPENSE
  'Зарплата': 'Другое', // для INCOME - переводы это не зарплата
};

async function main() {
  console.log('=== Очистка категорий ===\n');

  const users = await prisma.user.findMany();

  for (const user of users) {
    console.log(`Пользователь: ${user.email}`);

    // 1. Объединяем дубликаты
    for (const [sourceName, targetName] of Object.entries(MERGE_MAP)) {
      // Для EXPENSE
      const sourceExpense = await prisma.category.findFirst({
        where: { userId: user.id, name: sourceName, type: 'EXPENSE' },
      });
      if (sourceExpense) {
        let targetExpense = await prisma.category.findFirst({
          where: { userId: user.id, name: targetName, type: 'EXPENSE' },
        });
        if (!targetExpense) {
          targetExpense = await prisma.category.create({
            data: { userId: user.id, name: targetName, type: 'EXPENSE', icon: ICONS[targetName], isSystem: false },
          });
        }
        const moved = await prisma.transaction.updateMany({
          where: { categoryId: sourceExpense.id },
          data: { categoryId: targetExpense.id },
        });
        await prisma.category.delete({ where: { id: sourceExpense.id } });
        console.log(`  EXPENSE: ${sourceName} -> ${targetName} (${moved.count} транзакций)`);
      }

      // Для INCOME
      const sourceIncome = await prisma.category.findFirst({
        where: { userId: user.id, name: sourceName, type: 'INCOME' },
      });
      if (sourceIncome) {
        const targetForIncome = sourceName === 'Прочие операции' ? 'Другое' : targetName;
        let targetIncome = await prisma.category.findFirst({
          where: { userId: user.id, name: targetForIncome, type: 'INCOME' },
        });
        if (!targetIncome) {
          targetIncome = await prisma.category.create({
            data: { userId: user.id, name: targetForIncome, type: 'INCOME', icon: ICONS[targetForIncome], isSystem: false },
          });
        }
        const moved = await prisma.transaction.updateMany({
          where: { categoryId: sourceIncome.id },
          data: { categoryId: targetIncome.id },
        });
        await prisma.category.delete({ where: { id: sourceIncome.id } });
        console.log(`  INCOME: ${sourceName} -> ${targetForIncome} (${moved.count} транзакций)`);
      }
    }

    // 2. "Перевод СБП" для EXPENSE -> "Прочие расходы"
    const sberTransferExpense = await prisma.category.findFirst({
      where: { userId: user.id, name: 'Перевод СБП', type: 'EXPENSE' },
    });
    if (sberTransferExpense) {
      let prochie = await prisma.category.findFirst({
        where: { userId: user.id, name: 'Прочие расходы', type: 'EXPENSE' },
      });
      if (!prochie) {
        prochie = await prisma.category.create({
          data: { userId: user.id, name: 'Прочие расходы', type: 'EXPENSE', icon: '📦', isSystem: false },
        });
      }
      const moved = await prisma.transaction.updateMany({
        where: { categoryId: sberTransferExpense.id },
        data: { categoryId: prochie.id },
      });
      await prisma.category.delete({ where: { id: sberTransferExpense.id } });
      console.log(`  EXPENSE: Перевод СБП -> Прочие расходы (${moved.count} транзакций)`);
    }

    // 3. Добавляем иконки где нет
    const catsWithoutIcons = await prisma.category.findMany({
      where: { userId: user.id, icon: null },
    });
    for (const cat of catsWithoutIcons) {
      const icon = ICONS[cat.name];
      if (icon) {
        await prisma.category.update({
          where: { id: cat.id },
          data: { icon },
        });
        console.log(`  Иконка: ${icon} ${cat.name}`);
      }
    }

    // 4. Удаляем пустые категории (без транзакций) кроме базовых
    const emptyCats = await prisma.category.findMany({
      where: { userId: user.id },
      include: { _count: { select: { transactions: true } } },
    });
    const baseCats = ['Прочие расходы', 'Другое', 'Супермаркеты', 'Перевод СБП'];
    for (const cat of emptyCats) {
      if (cat._count.transactions === 0 && !baseCats.includes(cat.name)) {
        await prisma.category.delete({ where: { id: cat.id } });
        console.log(`  Удалена пустая: ${cat.name}`);
      }
    }
  }

  console.log('\n=== Готово ===');

  // Итоговый список
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  console.log('\nИтоговые категории:');
  cats.forEach(c => console.log(`  ${c.icon || '  '} ${c.name} (${c.type})`));
  console.log(`Всего: ${cats.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
