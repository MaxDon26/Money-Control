import { apiClient } from './client';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface TransactionTag {
  id: string;
  name: string;
  color?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    name: string;
    currency: string;
  };
  category: {
    id: string;
    name: string;
    icon?: string;
    type: string;
  };
  tags?: TransactionTag[];
}

export interface CreateTransactionData {
  amount: number;
  type: TransactionType;
  accountId: string;
  categoryId: string;
  date: string;
  description?: string;
  tagIds?: string[];
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {}

export interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TransactionStats {
  income: number;
  expense: number;
  balance: number;
}

export const transactionsApi = {
  getAll: async (filters?: TransactionFilters): Promise<TransactionsResponse> => {
    const { data } = await apiClient.get('/transactions', { params: filters });
    return data;
  },

  getOne: async (id: string): Promise<Transaction> => {
    const { data } = await apiClient.get(`/transactions/${id}`);
    return data;
  },

  getStats: async (dateFrom?: string, dateTo?: string): Promise<TransactionStats> => {
    const { data } = await apiClient.get('/transactions/stats', {
      params: { dateFrom, dateTo },
    });
    return data;
  },

  create: async (dto: CreateTransactionData): Promise<Transaction> => {
    const { data } = await apiClient.post('/transactions', dto);
    return data;
  },

  update: async (id: string, dto: UpdateTransactionData): Promise<Transaction> => {
    const { data } = await apiClient.patch(`/transactions/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
};
