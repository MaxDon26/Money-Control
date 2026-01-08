import { apiClient } from './client';
import { TransactionType } from './transactions';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringPayment {
  id: string;
  userId: string;
  name: string;
  amount: number;
  categoryId: string;
  accountId: string;
  type: TransactionType;
  frequency: Frequency;
  startDate: string;
  nextDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
}

export interface UpcomingPayment extends RecurringPayment {
  daysUntil: number;
}

export interface CreateRecurringData {
  name: string;
  amount: number;
  categoryId: string;
  accountId: string;
  type: TransactionType;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
}

export interface UpdateRecurringData extends Partial<CreateRecurringData> {
  isActive?: boolean;
}

export const recurringApi = {
  getAll: async (): Promise<RecurringPayment[]> => {
    const { data } = await apiClient.get('/recurring');
    return data;
  },

  getOne: async (id: string): Promise<RecurringPayment> => {
    const { data } = await apiClient.get(`/recurring/${id}`);
    return data;
  },

  getUpcoming: async (days?: number): Promise<UpcomingPayment[]> => {
    const { data } = await apiClient.get('/recurring/upcoming', {
      params: days ? { days } : {},
    });
    return data;
  },

  create: async (dto: CreateRecurringData): Promise<RecurringPayment> => {
    const { data } = await apiClient.post('/recurring', dto);
    return data;
  },

  update: async (id: string, dto: UpdateRecurringData): Promise<RecurringPayment> => {
    const { data } = await apiClient.patch(`/recurring/${id}`, dto);
    return data;
  },

  toggle: async (id: string): Promise<RecurringPayment> => {
    const { data } = await apiClient.patch(`/recurring/${id}/toggle`);
    return data;
  },

  skip: async (id: string): Promise<RecurringPayment> => {
    const { data } = await apiClient.post(`/recurring/${id}/skip`);
    return data;
  },

  process: async (id: string): Promise<void> => {
    await apiClient.post(`/recurring/${id}/process`);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/recurring/${id}`);
  },
};
