import { apiClient } from './client';

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  parentId?: string;
  isSystem: boolean;
  createdAt: string;
  children?: Category[];
  parent?: Category;
}

export interface CreateCategoryData {
  name: string;
  type: CategoryType;
  icon?: string;
  parentId?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export const categoriesApi = {
  getAll: async (type?: CategoryType): Promise<Category[]> => {
    const params = type ? { type } : {};
    const { data } = await apiClient.get('/categories', { params });
    return data;
  },

  getOne: async (id: string): Promise<Category> => {
    const { data } = await apiClient.get(`/categories/${id}`);
    return data;
  },

  create: async (dto: CreateCategoryData): Promise<Category> => {
    const { data } = await apiClient.post('/categories', dto);
    return data;
  },

  update: async (id: string, dto: UpdateCategoryData): Promise<Category> => {
    const { data } = await apiClient.patch(`/categories/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
