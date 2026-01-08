import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Tabs,
  List,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { categoriesApi, Category, CategoryType, CreateCategoryData } from '@/shared/api';
import { SEO } from '@/shared/ui';

const { Title, Text } = Typography;

const categoryTypeLabels: Record<CategoryType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
};

const defaultIcons: Record<CategoryType, string[]> = {
  EXPENSE: ['🛒', '🚗', '🏠', '📱', '💊', '👕', '🎬', '🍽️', '📺', '📚', '🎁', '📦'],
  INCOME: ['💰', '💻', '📈', '🎁', '↩️', '📦'],
};

interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parent: Category) => void;
}

const CategoryCard = ({ category, onEdit, onDelete, onAddChild, isChild }: {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parent: Category) => void;
  isChild?: boolean;
}) => (
  <div
    style={{
      padding: isChild ? 12 : 16,
      border: '1px solid #f0f0f0',
      borderRadius: 8,
      textAlign: 'center',
      position: 'relative',
      transition: 'border-color 0.3s, box-shadow 0.3s',
      minHeight: category.isSystem ? (isChild ? 80 : 100) : (isChild ? 100 : 140),
      backgroundColor: isChild ? '#fafafa' : 'white',
    }}
    className="category-card"
  >
    {category.isSystem && (
      <Tooltip title="Системная категория">
        <LockOutlined
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#999',
            fontSize: 12,
          }}
        />
      </Tooltip>
    )}
    <div style={{ fontSize: isChild ? 24 : 32, marginBottom: 8 }}>{category.icon || '📁'}</div>
    <Tooltip title={category.name}>
      <div
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
          cursor: 'default',
          fontSize: isChild ? 12 : 14,
        }}
      >
        {category.name}
      </div>
    </Tooltip>
    {!category.isSystem && (
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 4 }}>
        {!isChild && (
          <Tooltip title="Добавить подкатегорию">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAddChild(category)}
            />
          </Tooltip>
        )}
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(category)}
        />
        <Popconfirm
          title="Удалить категорию?"
          description="Это действие нельзя отменить"
          onConfirm={() => onDelete(category.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
    )}
  </div>
);

const CategoryList = ({ categories, onEdit, onDelete, onAddChild }: CategoryListProps) => {
  // Фильтруем только родительские категории (без parentId)
  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <List
      grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5 }}
      dataSource={parentCategories}
      locale={{ emptyText: <Empty description="Нет категорий" /> }}
      renderItem={(category) => (
        <List.Item>
          <div>
            <CategoryCard
              category={category}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
            {category.children && category.children.length > 0 && (
              <div style={{ marginTop: 8, marginLeft: 16 }}>
                {category.children.map((child) => (
                  <div key={child.id} style={{ marginBottom: 8 }}>
                    <CategoryCard
                      category={child}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddChild={onAddChild}
                      isChild
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </List.Item>
      )}
    />
  );
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Категория создана');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при создании категории'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryData> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Категория обновлена');
      handleCloseModal();
    },
    onError: () => message.error('Ошибка при обновлении категории'),
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      message.success('Категория удалена');
    },
    onError: () => message.error('Ошибка при удалении категории'),
  });

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue(category);
    } else {
      setEditingCategory(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setParentCategory(null);
    form.resetFields();
  };

  const handleAddChild = (parent: Category) => {
    setParentCategory(parent);
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ type: parent.type });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: CreateCategoryData) => {
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, data: values });
    } else {
      const data = parentCategory
        ? { ...values, parentId: parentCategory.id }
        : values;
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const items = [
    {
      key: 'expense',
      label: (
        <span>
          Расходы <Tag color="red">{expenseCategories.length}</Tag>
        </span>
      ),
      children: (
        <CategoryList
          categories={expenseCategories}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
        />
      ),
    },
    {
      key: 'income',
      label: (
        <span>
          Доходы <Tag color="green">{incomeCategories.length}</Tag>
        </span>
      ),
      children: (
        <CategoryList
          categories={incomeCategories}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
        />
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Категории"
        description="Управление категориями доходов и расходов"
        noIndex
      />
      <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Категории
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Добавить категорию
        </Button>
      </div>

      <Tabs items={items} />

      <Modal
        title={
          editingCategory
            ? 'Редактировать категорию'
            : parentCategory
              ? `Новая подкатегория для "${parentCategory.name}"`
              : 'Новая категория'
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'EXPENSE' }}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Например: Кафе" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select disabled={!!editingCategory || !!parentCategory}>
              {Object.entries(categoryTypeLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="icon" label="Иконка">
            <Select placeholder="Выберите иконку">
              <Select.OptGroup label="Расходы">
                {defaultIcons.EXPENSE.map((icon) => (
                  <Select.Option key={icon} value={icon}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                  </Select.Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="Доходы">
                {defaultIcons.INCOME.map((icon) => (
                  <Select.Option key={icon} value={icon}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                  </Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={handleCloseModal}>Отмена</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .category-card:hover {
          border-color: #1890ff !important;
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
        }
      `}</style>
    </div>
    </>
  );
}
