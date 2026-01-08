import { apiClient } from './client';
import { Transaction } from './transactions';

export interface AnalyticsSummary {
  totalBalance: number;
  income: number;
  expense: number;
  savings: number;
}

export interface CategoryData {
  category: {
    id: string;
    name: string;
    icon?: string;
    type?: string;
  };
  amount: number;
}

export interface ByCategory {
  expenses: CategoryData[];
  incomes: CategoryData[];
}

export interface TrendData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface AnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
}

export const analyticsApi = {
  getSummary: async (query?: AnalyticsQuery): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get('/analytics/summary', { params: query });
    return data;
  },

  getByCategory: async (query?: AnalyticsQuery): Promise<ByCategory> => {
    const { data } = await apiClient.get('/analytics/by-category', { params: query });
    return data;
  },

  getTrend: async (months?: number): Promise<TrendData[]> => {
    const { data } = await apiClient.get('/analytics/trend', {
      params: months ? { months } : {},
    });
    return data;
  },

  getRecent: async (limit?: number): Promise<Transaction[]> => {
    const { data } = await apiClient.get('/analytics/recent', {
      params: limit ? { limit } : {},
    });
    return data;
  },

  getTopCategories: async (limit?: number, query?: AnalyticsQuery): Promise<CategoryData[]> => {
    const { data } = await apiClient.get('/analytics/top-categories', {
      params: { ...query, limit },
    });
    return data;
  },
};
