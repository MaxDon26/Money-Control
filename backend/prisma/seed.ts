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

/**
 * Создаёт базовые категории для пользователя
 * Вызывается при регистрации нового пользователя
 */
export async function createDefaultCategoriesForUser(userId: string) {
  const existingCategories = await prisma.category.count({
    where: { userId },
  });

  // Если у пользователя уже есть категории, не создаём новые
  if (existingCategories > 0) {
    return;
  }

  // Создаём категории расходов
  for (const cat of EXPENSE_CATEGORIES) {
    await prisma.category.create({
      data: {
        userId,
        name: cat.name,
        type: 'EXPENSE',
        icon: cat.icon,
        isSystem: false,
      },
    });
  }

  // Создаём категории доходов
  for (const cat of INCOME_CATEGORIES) {
    await prisma.category.create({
      data: {
        userId,
        name: cat.name,
        type: 'INCOME',
        icon: cat.icon,
        isSystem: false,
      },
    });
  }
}

async function main() {
  console.log('Database seeding...');
  console.log('Default categories are created when a new user registers.');
  console.log('To create categories for existing users, run: npx prisma db seed --force');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
