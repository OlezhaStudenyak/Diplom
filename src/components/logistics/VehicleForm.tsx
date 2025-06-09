import React, { useState } from 'react';
import { useLogisticsStore } from '../../store/logisticsStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Select from '../ui/Select';

interface VehicleFormProps {
  vehicle?: {
    id: string;
    license_plate: string;
    model: string;
    make: string;
    year: number;
    capacity: number;
    status: string;
    last_maintenance_date?: string;
    next_maintenance_date?: string;
    notes?: string;
  };
  onClose: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose }) => {
  const { loading, error, createVehicle, updateVehicle } = useLogisticsStore();
  
  const [formData, setFormData] = useState({
    license_plate: vehicle?.license_plate || '',
    model: vehicle?.model || '',
    make: vehicle?.make || '',
    year: vehicle?.year || new Date().getFullYear(),
    capacity: vehicle?.capacity || 0,
    status: vehicle?.status || 'available',
    last_maintenance_date: vehicle?.last_maintenance_date || '',
    next_maintenance_date: vehicle?.next_maintenance_date || '',
    notes: vehicle?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (vehicle) {
        await updateVehicle(vehicle.id, formData);
      } else {
        await createVehicle(formData);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save vehicle:', err);
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Доступний' },
    { value: 'in_delivery', label: 'У дорозі' },
    { value: 'maintenance', label: 'На обслуговуванні' },
    { value: 'out_of_service', label: 'Не працює' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold text-neutral-900">
          {vehicle ? 'Редагувати транспорт' : 'Додати новий транспорт'}
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

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Номерний знак"
          value={formData.license_plate}
          onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
          required
          fullWidth
        />

        <Input
          label="Рік випуску"
          type="number"
          min={1900}
          max={new Date().getFullYear() + 1}
          value={formData.year}
          onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Марка"
          value={formData.make}
          onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
          required
          fullWidth
        />

        <Input
          label="Модель"
          value={formData.model}
          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Вантажопідйомність (кг)"
          type="number"
          min="0"
          step="0.1"
          value={formData.capacity}
          onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseFloat(e.target.value) }))}
          required
          fullWidth
        />

        <Select
          label="Статус"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          options={statusOptions}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Остання перевірка"
          type="date"
          value={formData.last_maintenance_date}
          onChange={(e) => setFormData(prev => ({ ...prev, last_maintenance_date: e.target.value }))}
          fullWidth
        />

        <Input
          label="Наступна перевірка"
          type="date"
          value={formData.next_maintenance_date}
          onChange={(e) => setFormData(prev => ({ ...prev, next_maintenance_date: e.target.value }))}
          fullWidth
        />
      </div>

      <Input
        label="Примітки"
        as="textarea"
        rows={3}
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
          {vehicle ? 'Зберегти' : 'Створити'}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;