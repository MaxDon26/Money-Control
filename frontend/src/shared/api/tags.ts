import { apiClient } from './client';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const { data } = await apiClient.get('/tags');
    return data;
  },

  create: async (dto: CreateTagData): Promise<Tag> => {
    const { data } = await apiClient.post('/tags', dto);
    return data;
  },

  update: async (id: string, dto: Partial<CreateTagData>): Promise<Tag> => {
    const { data } = await apiClient.patch(`/tags/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tags/${id}`);
  },
};
