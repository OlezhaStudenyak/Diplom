import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useInventoryStore } from '../../store/inventoryStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Modal from '../ui/Modal';
import type { UnitType } from '../../types';

interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    sku: string;
    description: string;
    category_id: string;
    price: number;
    cost: number;
    unit_type: UnitType;
    unit_value: number;
    minimum_stock: number;
    maximum_stock: number;
  };
  onClose: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose }) => {
  const { 
    categories, 
    loading, 
    error, 
    fetchCategories, 
    createProduct, 
    updateProduct,
    createCategory 
  } = useInventoryStore();
  
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    unit_type: product?.unit_type || 'piece',
    unit_value: product?.unit_value || 1,
    minimum_stock: product?.minimum_stock || 0,
    maximum_stock: product?.maximum_stock || 0,
    warehouse_id: ''
  });

  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchWarehouses();
  }, [fetchCategories, fetchWarehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category_id: formData.category_id || null,
        price: formData.price,
        cost: formData.cost,
        unit_type: formData.unit_type,
        unit_value: formData.unit_value,
        minimum_stock: formData.minimum_stock,
        maximum_stock: formData.maximum_stock
      };

      if (product) {
        await updateProduct(product.id, productData);
      } else {
        await createProduct(productData);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const category = await createCategory(newCategory);
      if (category) {
        setFormData(prev => ({ ...prev, category_id: category.id }));
        setIsNewCategoryModalOpen(false);
        setNewCategory({ name: '', description: '' });
        await fetchCategories();
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  const unitTypeOptions = [
    { value: 'piece', label: 'Штуки' },
    { value: 'kilogram', label: 'Кілограми' },
    { value: 'liter', label: 'Літри' },
  ];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-semibold text-neutral-900">
            {product ? 'Редагувати товар' : 'Додати новий товар'}
          </h2>
        </div>

        {error && (
          <Alert 
            variant="error" 
            title="Помилка" 
            className="mb-4"
          >
            {error}
          </Alert>
        )}

        <Input
          label="Назва"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          fullWidth
        />

        <Input
          label="Артикул"
          value={formData.sku}
          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
          required
          fullWidth
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              label="Категорія"
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              options={[
                { value: '', label: 'Оберіть категорію' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
              fullWidth
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              icon={<Plus size={18} />}
              onClick={() => setIsNewCategoryModalOpen(true)}
            >
              Нова категорія
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ціна"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
            required
            fullWidth
          />

          <Input
            label="Собівартість"
            type="number"
            min="0"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) }))}
            required
            fullWidth
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Одиниця виміру"
            value={formData.unit_type}
            onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value as UnitType }))}
            options={unitTypeOptions}
            required
            fullWidth
          />

          <Input
            label="Значення одиниці"
            type="number"
            min="0.001"
            step="0.001"
            value={formData.unit_value}
            onChange={(e) => setFormData(prev => ({ ...prev, unit_value: parseFloat(e.target.value) }))}
            required
            fullWidth
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Мінімальний запас"
            type="number"
            min="0"
            value={formData.minimum_stock}
            onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: parseFloat(e.target.value) }))}
            required
            fullWidth
          />

          <Input
            label="Максимальний запас"
            type="number"
            min="0"
            value={formData.maximum_stock}
            onChange={(e) => setFormData(prev => ({ ...prev, maximum_stock: parseFloat(e.target.value) }))}
            required
            fullWidth
          />
        </div>

        <Select
          label="Склад"
          value={formData.warehouse_id}
          onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: e.target.value }))}
          options={[
            { value: '', label: 'Оберіть склад' },
            ...warehouses.map(w => ({ value: w.id, label: w.name }))
          ]}
          required
          fullWidth
        />

        <Input
          label="Опис"
          as="textarea"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          fullWidth
        />

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Скасувати
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {product ? 'Зберегти' : 'Створити'}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={isNewCategoryModalOpen}
        onClose={() => setIsNewCategoryModalOpen(false)}
        size="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-display font-semibold text-neutral-900">
              Нова категорія
            </h3>
          </div>

          <Input
            label="Назва категорії"
            value={newCategory.name}
            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
            required
            fullWidth
          />

          <Input
            label="Опис"
            as="textarea"
            rows={3}
            value={newCategory.description}
            onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            fullWidth
          />

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setIsNewCategoryModalOpen(false)}
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              isLoading={loading}
            >
              Створити
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ProductForm;