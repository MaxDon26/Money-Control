import { apiClient } from './client';

export type AccountType = 'CASH' | 'CARD' | 'DEPOSIT' | 'CREDIT' | 'INVESTMENT';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  icon?: string;
  color?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountData {
  name: string;
  type: AccountType;
  currency?: string;
  balance: number;
  icon?: string;
  color?: string;
}

export type UpdateAccountData = Partial<CreateAccountData>;

export interface TotalBalance {
  total: number;
  currency: string;
}

export const accountsApi = {
  getAll: async (): Promise<Account[]> => {
    const { data } = await apiClient.get('/accounts');
    return data;
  },

  getOne: async (id: string): Promise<Account> => {
    const { data } = await apiClient.get(`/accounts/${id}`);
    return data;
  },

  getTotalBalance: async (): Promise<TotalBalance> => {
    const { data } = await apiClient.get('/accounts/total');
    return data;
  },

  create: async (dto: CreateAccountData): Promise<Account> => {
    const { data } = await apiClient.post('/accounts', dto);
    return data;
  },

  update: async (id: string, dto: UpdateAccountData): Promise<Account> => {
    const { data } = await apiClient.patch(`/accounts/${id}`, dto);
    return data;
  },

  archive: async (id: string): Promise<Account> => {
    const { data } = await apiClient.delete(`/accounts/${id}`);
    return data;
  },
};
