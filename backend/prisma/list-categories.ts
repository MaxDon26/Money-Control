import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  console.log('Категории:');
  cats.forEach(c => console.log(`  ${c.icon || '  '} ${c.name} (${c.type})`));
  console.log(`\nВсего: ${cats.length}`);
}

main().finally(() => prisma.$disconnect());
