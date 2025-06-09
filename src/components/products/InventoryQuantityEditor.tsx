import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../store/inventoryStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Alert from '../ui/Alert';
import { Package, Warehouse } from 'lucide-react';

interface InventoryQuantityEditorProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

const InventoryQuantityEditor: React.FC<InventoryQuantityEditorProps> = ({
  productId,
  productName,
  onClose
}) => {
  const { levels, loading, error, fetchLevels, updateInventoryQuantity } = useInventoryStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    fetchWarehouses();
    fetchLevels(productId);
  }, [fetchWarehouses, fetchLevels, productId]);

  const currentLevel = levels.find(level => 
    level.productId === productId && level.warehouseId === selectedWarehouse
  );

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId);
    const level = levels.find(l => l.productId === productId && l.warehouseId === warehouseId);
    setNewQuantity(level ? Number(level.quantity) : 0);
    setUpdateError('');
    setUpdateSuccess(false);
  };

  const handleQuantityUpdate = async () => {
    if (!selectedWarehouse || !currentLevel) return;

    try {
      setUpdateLoading(true);
      setUpdateError('');
      setUpdateSuccess(false);

      await updateInventoryQuantity(currentLevel.id, newQuantity);
      setUpdateSuccess(true);
      
      // Refresh levels to get updated data
      await fetchLevels(productId);
      
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to update inventory quantity:', error);
      setUpdateError('Помилка при оновленні кількості товару');
    } finally {
      setUpdateLoading(false);
    }
  };

  const warehouseOptions = [
    { value: '', label: 'Оберіть склад' },
    ...warehouses.map(warehouse => ({
      value: warehouse.id,
      label: warehouse.name
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-semibold text-neutral-900">
          Редагувати кількість товару
        </h2>
        <p className="text-neutral-600 mt-1">
          {productName}
        </p>
      </div>

      {updateSuccess && (
        <Alert variant="success" className="mb-4">
          Кількість товару успішно оновлена
        </Alert>
      )}

      {updateError && (
        <Alert variant="error" className="mb-4">
          {updateError}
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Select
        label="Склад"
        value={selectedWarehouse}
        onChange={(e) => handleWarehouseChange(e.target.value)}
        options={warehouseOptions}
        fullWidth
        leftIcon={<Warehouse size={18} />}
      />

      {selectedWarehouse && currentLevel && (
        <div className="space-y-4">
          <div className="bg-neutral-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">
                Поточна кількість:
              </span>
              <span className="text-lg font-semibold text-neutral-900">
                {Number(currentLevel.quantity).toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-neutral-600">
                Мінімальний запас:
              </span>
              <span className="text-sm text-neutral-600">
                {Number(currentLevel.minimumQuantity).toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                Максимальний запас:
              </span>
              <span className="text-sm text-neutral-600">
                {Number(currentLevel.maximumQuantity).toFixed(2)}
              </span>
            </div>
          </div>

          <Input
            label="Нова кількість"
            type="number"
            min="0"
            step="0.01"
            value={newQuantity}
            onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
            fullWidth
            leftIcon={<Package size={18} />}
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={updateLoading}
            >
              Скасувати
            </Button>
            <Button
              onClick={handleQuantityUpdate}
              isLoading={updateLoading}
              disabled={!selectedWarehouse || newQuantity < 0}
            >
              Оновити кількість
            </Button>
          </div>
        </div>
      )}

      {selectedWarehouse && !currentLevel && !loading && (
        <div className="text-center py-8">
          <Package size={48} className="mx-auto text-neutral-400 mb-4" />
          <p className="text-neutral-600">
            Товар не знайдено на обраному складі
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryQuantityEditor;