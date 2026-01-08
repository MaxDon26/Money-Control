import { apiClient } from './client';

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
  fromAccount: {
    id: string;
    name: string;
    currency: string;
  };
  toAccount: {
    id: string;
    name: string;
    currency: string;
  };
}

export interface CreateTransferData {
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  date: string;
  description?: string;
}

export const transfersApi = {
  getAll: async (): Promise<Transfer[]> => {
    const { data } = await apiClient.get('/transfers');
    return data;
  },

  getOne: async (id: string): Promise<Transfer> => {
    const { data } = await apiClient.get(`/transfers/${id}`);
    return data;
  },

  create: async (dto: CreateTransferData): Promise<Transfer> => {
    const { data } = await apiClient.post('/transfers', dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transfers/${id}`);
  },
};
