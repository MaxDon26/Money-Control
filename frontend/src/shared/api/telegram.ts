import { apiClient } from './client';

export interface TelegramLinkStatus {
  linked: boolean;
  username?: string;
  firstName?: string;
  linkedAt?: string;
}

export interface TelegramLinkCode {
  code: string;
  expiresIn: number;
  botUsername: string | null;
  botLink: string | null;
}

export const telegramApi = {
  getStatus: async (): Promise<TelegramLinkStatus> => {
    const response = await apiClient.get<TelegramLinkStatus>('/telegram/status');
    return response.data;
  },

  generateLinkCode: async (): Promise<TelegramLinkCode> => {
    const response = await apiClient.post<TelegramLinkCode>('/telegram/link-code');
    return response.data;
  },

  unlink: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>('/telegram/unlink');
    return response.data;
  },
};
