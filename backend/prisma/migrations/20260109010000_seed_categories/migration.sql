-- Seed default categories (only if table is empty)
INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Зарплата', 'INCOME', '💰', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" LIMIT 1);

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Фриланс', 'INCOME', '💻', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Фриланс');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Инвестиции', 'INCOME', '📈', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Инвестиции');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Подарки', 'INCOME', '🎁', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Подарки' AND "type" = 'INCOME');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Возврат', 'INCOME', '↩️', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Возврат');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Другое', 'INCOME', '📥', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Другое' AND "type" = 'INCOME');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Продукты', 'EXPENSE', '🛒', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Продукты');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Транспорт', 'EXPENSE', '🚗', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Транспорт');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Жильё', 'EXPENSE', '🏠', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Жильё');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Связь', 'EXPENSE', '📱', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Связь');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Здоровье', 'EXPENSE', '💊', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Здоровье');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Одежда', 'EXPENSE', '👕', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Одежда');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Развлечения', 'EXPENSE', '🎬', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Развлечения');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Рестораны', 'EXPENSE', '🍽️', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Рестораны');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Подписки', 'EXPENSE', '📺', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Подписки');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Образование', 'EXPENSE', '📚', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Образование');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Подарки', 'EXPENSE', '🎁', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Подарки' AND "type" = 'EXPENSE');

INSERT INTO "categories" ("id", "name", "type", "icon", "isSystem", "createdAt")
SELECT gen_random_uuid(), 'Другое', 'EXPENSE', '📦', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Другое' AND "type" = 'EXPENSE');
