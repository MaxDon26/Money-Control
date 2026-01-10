import { apiClient } from './client';

export interface ImportResult {
  imported: number;
  skipped: number;
  bankName: string;
  categorization?: {
    byKeywords: number;
    byAi: number;
    byDefault: number;
  };
}

export interface DetectAccountResult {
  bankName: string;
  accountNumber: string | null;
  matchedAccountId: string | null;
  matchedAccountName: string | null;
}

export const importApi = {
  detectAccount: async (file: File): Promise<DetectAccountResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<DetectAccountResult>(
      '/import/detect-account',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return data;
  },

  importStatement: async (
    accountId: string,
    file: File,
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);

    const { data } = await apiClient.post<ImportResult>(
      '/import/statement',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return data;
  },
};
