export interface CategoryForAi {
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export const DEFAULT_EXPENSE_CATEGORY = 'Прочие расходы';
export const DEFAULT_INCOME_CATEGORY = 'Прочие доходы';

export function buildSystemPrompt(categories: CategoryForAi[]): string {
  const expenseCategories = categories
    .filter((c) => c.type === 'EXPENSE')
    .map((c) => c.name);

  const incomeCategories = categories
    .filter((c) => c.type === 'INCOME')
    .map((c) => c.name);

  // Ensure default categories are always present
  if (!expenseCategories.includes(DEFAULT_EXPENSE_CATEGORY)) {
    expenseCategories.push(DEFAULT_EXPENSE_CATEGORY);
  }
  if (!incomeCategories.includes(DEFAULT_INCOME_CATEGORY)) {
    incomeCategories.push(DEFAULT_INCOME_CATEGORY);
  }

  return `Ты — классификатор банковских транзакций. Твоя задача — определить категорию для каждой транзакции.

ДОСТУПНЫЕ КАТЕГОРИИ РАСХОДОВ:
${expenseCategories.map((c) => `- ${c}`).join('\n')}

ДОСТУПНЫЕ КАТЕГОРИИ ДОХОДОВ:
${incomeCategories.map((c) => `- ${c}`).join('\n')}

ПРАВИЛА:
1. Используй ТОЛЬКО категории из списка выше (точное название)
2. Для расходов (EXPENSE) выбирай из категорий расходов
3. Для доходов (INCOME) выбирай из категорий доходов
4. Если не можешь определить категорию — используй "${DEFAULT_EXPENSE_CATEGORY}" для расходов или "${DEFAULT_INCOME_CATEGORY}" для доходов
5. Отвечай ТОЛЬКО JSON без пояснений`;
}

export function buildUserPrompt(
  transactions: { id: number; type: string; description: string }[],
): string {
  const data = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
  }));

  return `Категоризируй транзакции:

${JSON.stringify(data, null, 2)}

Ответ (только JSON, формат {"id": "категория"}):`;
}
