import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/warehouseStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

interface WarehouseFormProps {
  warehouse?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    latitude: number;
    longitude: number;
    total_capacity: number;
  };
  onClose: () => void;
}

const WarehouseForm: React.FC<WarehouseFormProps> = ({ warehouse, onClose }) => {
  const { loading, error, createWarehouse, updateWarehouse } = useWarehouseStore();
  
  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    address: warehouse?.address || '',
    city: warehouse?.city || '',
    state: warehouse?.state || '',
    country: warehouse?.country || '',
    postal_code: warehouse?.postal_code || '',
    latitude: warehouse?.latitude || 0,
    longitude: warehouse?.longitude || 0,
    total_capacity: warehouse?.total_capacity || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (warehouse) {
        await updateWarehouse(warehouse.id, formData);
      } else {
        await createWarehouse(formData);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save warehouse:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold text-neutral-900">
          {warehouse ? 'Редагувати склад' : 'Додати новий склад'}
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
        label="Адреса"
        value={formData.address}
        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
        required
        fullWidth
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Місто"
          value={formData.city}
          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
          required
          fullWidth
        />

        <Input
          label="Область"
          value={formData.state}
          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Країна"
          value={formData.country}
          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
          required
          fullWidth
        />

        <Input
          label="Поштовий індекс"
          value={formData.postal_code}
          onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Широта"
          type="number"
          step="any"
          value={formData.latitude}
          onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
          required
          fullWidth
        />

        <Input
          label="Довгота"
          type="number"
          step="any"
          value={formData.longitude}
          onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
          required
          fullWidth
        />
      </div>

      <Input
        label="Загальна місткість"
        type="number"
        min="0"
        value={formData.total_capacity}
        onChange={(e) => setFormData(prev => ({ ...prev, total_capacity: parseInt(e.target.value) }))}
        required
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
          {warehouse ? 'Зберегти' : 'Створити'}
        </Button>
      </div>
    </form>
  );
};

export default WarehouseForm;