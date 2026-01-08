import { apiClient } from './client';

export type BudgetStatus = 'ok' | 'warning' | 'danger';

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string;
  amount: number;
  month: number;
  year: number;
  isTotal?: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export interface TotalBudget {
  id: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
  month: number;
  year: number;
}

export interface CreateBudgetData {
  categoryId?: string;
  amount: number;
  month: number;
  year: number;
  isTotal?: boolean;
}

export interface UpdateBudgetData {
  amount?: number;
}

export interface BudgetProgress {
  budgets: Budget[];
  totalBudget: TotalBudget | null;
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercentage: number;
    monthlyExpenses: number;
  };
}

export const budgetsApi = {
  getAll: async (month?: number, year?: number): Promise<Budget[]> => {
    const { data } = await apiClient.get('/budgets', {
      params: { month, year },
    });
    return data;
  },

  getOne: async (id: string): Promise<Budget> => {
    const { data } = await apiClient.get(`/budgets/${id}`);
    return data;
  },

  getProgress: async (month?: number, year?: number): Promise<BudgetProgress> => {
    const { data } = await apiClient.get('/budgets/progress', {
      params: { month, year },
    });
    return data;
  },

  create: async (dto: CreateBudgetData): Promise<Budget> => {
    const { data } = await apiClient.post('/budgets', dto);
    return data;
  },

  update: async (id: string, dto: UpdateBudgetData): Promise<Budget> => {
    const { data } = await apiClient.patch(`/budgets/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/budgets/${id}`);
  },

  copyFromPrevious: async (month: number, year: number): Promise<{ created: number }> => {
    const { data } = await apiClient.post('/budgets/copy-previous', null, {
      params: { month, year },
    });
    return data;
  },
};
