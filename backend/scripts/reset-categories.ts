import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Базовые категории расходов
const EXPENSE_CATEGORIES = [
  { name: 'Супермаркеты', icon: '🛒' },
  { name: 'Рестораны и кафе', icon: '🍽️' },
  { name: 'Транспорт и авто', icon: '🚗' },
  { name: 'Здоровье и аптеки', icon: '💊' },
  { name: 'Связь и интернет', icon: '📱' },
  { name: 'Подписки и сервисы', icon: '🌐' },
  { name: 'Одежда и обувь', icon: '👕' },
  { name: 'Развлечения', icon: '🎮' },
  { name: 'Жильё и ЖКХ', icon: '🏠' },
  { name: 'Техника', icon: '🖥️' },
  { name: 'Образование', icon: '📚' },
  { name: 'Кредиты и займы', icon: '🏦' },
  { name: 'Переводы исходящие', icon: '💸' },
  { name: 'Снятие наличных', icon: '💵' },
  { name: 'Прочие расходы', icon: '📦' },
];

// Базовые категории доходов
const INCOME_CATEGORIES = [
  { name: 'Зарплата', icon: '💰' },
  { name: 'Переводы входящие', icon: '💸' },
  { name: 'Кэшбэк и возврат', icon: '🔄' },
  { name: 'Проценты и дивиденды', icon: '📈' },
  { name: 'Прочие доходы', icon: '📥' },
];

async function main() {
  console.log('🔄 Начинаем сброс данных...\n');

  // Получаем всех пользователей
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`👥 Найдено пользователей: ${users.length}`);
  users.forEach(u => console.log(`   - ${u.email}`));

  // Удаляем транзакции
  const deletedTx = await prisma.transaction.deleteMany({});
  console.log(`\n🗑️  Удалено транзакций: ${deletedTx.count}`);

  // Удаляем переводы
  const deletedTransfers = await prisma.transfer.deleteMany({});
  console.log(`🗑️  Удалено переводов: ${deletedTransfers.count}`);

  // Удаляем бюджеты
  const deletedBudgets = await prisma.budget.deleteMany({});
  console.log(`🗑️  Удалено бюджетов: ${deletedBudgets.count}`);

  // Удаляем категории
  const deletedCats = await prisma.category.deleteMany({});
  console.log(`🗑️  Удалено категорий: ${deletedCats.count}`);

  // Создаём базовые категории для каждого пользователя
  console.log('\n✨ Создаём базовые категории...');

  for (const user of users) {
    console.log(`\n   Пользователь: ${user.email}`);

    // Категории расходов
    for (const cat of EXPENSE_CATEGORIES) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          type: 'EXPENSE',
          icon: cat.icon,
          isSystem: false,
        },
      });
    }
    console.log(`   ✅ Создано ${EXPENSE_CATEGORIES.length} категорий расходов`);

    // Категории доходов
    for (const cat of INCOME_CATEGORIES) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          type: 'INCOME',
          icon: cat.icon,
          isSystem: false,
        },
      });
    }
    console.log(`   ✅ Создано ${INCOME_CATEGORIES.length} категорий доходов`);
  }

  console.log('\n🎉 Готово!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
