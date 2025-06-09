import React, { useState, useEffect } from 'react';
import { useLogisticsStore } from '../../store/logisticsStore';
import { useAuthStore } from '../../store/authStore';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { format } from 'date-fns';

interface RouteFormProps {
  route?: {
    id: string;
    vehicleId?: string;
    driverId?: string;
    status: string;
    startTime: string;
    endTime?: string;
    totalDistance: number;
    totalStops: number;
    notes?: string;
  };
  onClose: () => void;
}

const RouteForm: React.FC<RouteFormProps> = ({ route, onClose }) => {
  const { loading, error, vehicles, fetchVehicles, createRoute, updateRoute } = useLogisticsStore();
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    vehicleId: route?.vehicleId || '',
    driverId: route?.driverId || '',
    startTime: route?.startTime ? format(new Date(route.startTime), "yyyy-MM-dd'T'HH:mm") : '',
    endTime: route?.endTime ? format(new Date(route.endTime), "yyyy-MM-dd'T'HH:mm") : '',
    totalDistance: route?.totalDistance || 0,
    totalStops: route?.totalStops || 0,
    notes: route?.notes || '',
  });

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (route) {
        await updateRoute(route.id, formData);
      } else {
        await createRoute({
          ...formData,
          status: 'planned',
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save route:', err);
    }
  };

  const availableVehicles = vehicles.filter(v => v.status === 'available');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold text-neutral-900">
          {route ? 'Редагувати маршрут' : 'Створити новий маршрут'}
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

      <Select
        label="Транспорт"
        value={formData.vehicleId}
        onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
        options={[
          { value: '', label: 'Оберіть транспорт' },
          ...availableVehicles.map(v => ({
            value: v.id,
            label: `${v.make} ${v.model} (${v.licensePlate})`
          }))
        ]}
        required
        fullWidth
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Початок маршруту"
          type="datetime-local"
          value={formData.startTime}
          onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          required
          fullWidth
        />

        <Input
          label="Кінець маршруту"
          type="datetime-local"
          value={formData.endTime}
          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Загальна відстань (км)"
          type="number"
          min="0"
          step="0.1"
          value={formData.totalDistance}
          onChange={(e) => setFormData(prev => ({ ...prev, totalDistance: parseFloat(e.target.value) }))}
          required
          fullWidth
        />

        <Input
          label="Кількість зупинок"
          type="number"
          min="0"
          value={formData.totalStops}
          onChange={(e) => setFormData(prev => ({ ...prev, totalStops: parseInt(e.target.value) }))}
          required
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
          {route ? 'Зберегти' : 'Створити'}
        </Button>
      </div>
    </form>
  );
};

export default RouteForm;