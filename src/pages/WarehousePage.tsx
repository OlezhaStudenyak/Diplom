import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Warehouse } from 'lucide-react';
import { useWarehouseStore } from '../store/warehouseStore';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import WarehouseForm from '../components/warehouses/WarehouseForm';

const WarehousePage: React.FC = () => {
  const { warehouses, loading, fetchWarehouses, deleteWarehouse } = useWarehouseStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const headers = [
    { key: 'name', label: 'Назва' },
    { key: 'address', label: 'Адреса' },
    { key: 'city', label: 'Місто' },
    { key: 'capacity', label: 'Місткість' },
    { key: 'status', label: 'Статус' },
    ...(user?.role === 'warehouse_worker' ? [{ key: 'actions', label: 'Дії', className: 'text-right' }] : [])
  ];

  const handleRowClick = (warehouse: any) => {
    if (user?.role === 'warehouse_worker') {
      setSelectedWarehouse(warehouse);
      setIsModalOpen(true);
    }
  };

  const handleEditWarehouse = (e: React.MouseEvent, warehouse: any) => {
    e.stopPropagation();
    setSelectedWarehouse(warehouse);
    setIsModalOpen(true);
  };

  const handleDeleteWarehouse = (e: React.MouseEvent, warehouse: any) => {
    e.stopPropagation();
    setWarehouseToDelete(warehouse);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!warehouseToDelete) return;

    try {
      setDeleteLoading(true);
      await deleteWarehouse(warehouseToDelete.id);
      setIsDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderRow = (warehouse: any) => {
    const baseRow = [
      <div className="font-medium text-neutral-900">{warehouse.name}</div>,
      <div className="text-neutral-600">{warehouse.address}</div>,
      <div className="text-neutral-600">{warehouse.city}</div>,
      <div className="text-neutral-600">{warehouse.total_capacity} одиниць</div>,
      <Badge
        variant={warehouse.status === 'active' ? 'success' : 'neutral'}
        size="sm"
      >
        {warehouse.status === 'active' ? 'Активний' : 'Неактивний'}
      </Badge>
    ];

    if (user?.role === 'warehouse_worker') {
      baseRow.push(
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Edit size={16} />}
            onClick={(e) => handleEditWarehouse(e, warehouse)}
          >
            Редагувати
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 size={16} />}
            onClick={(e) => handleDeleteWarehouse(e, warehouse)}
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            Видалити
          </Button>
        </div>
      );
    }

    return baseRow;
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedWarehouse(null);
    fetchWarehouses();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Склади</h1>
          <p className="text-neutral-500 mt-1">Управління складами та їх зонами</p>
        </div>
        
        {user?.role === 'warehouse_worker' && (
          <Button
            variant="primary"
            icon={<Plus size={20} />}
            onClick={() => setIsModalOpen(true)}
          >
            Додати склад
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Пошук складів..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>

        <Table
          headers={headers}
          data={filteredWarehouses}
          renderRow={renderRow}
          isLoading={loading}
          onRowClick={user?.role === 'warehouse_worker' ? handleRowClick : undefined}
          emptyState={
            <div className="text-center py-12">
              <Warehouse size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Складів не знайдено
              </h3>
              <p className="text-neutral-600">
                {user?.role === 'warehouse_worker' 
                  ? 'Створіть новий склад, щоб почати роботу'
                  : 'Спробуйте змінити параметри пошуку'
                }
              </p>
            </div>
          }
        />
      </Card>

      {user?.role === 'warehouse_worker' && (
        <>
          <Modal 
            isOpen={isModalOpen} 
            onClose={handleModalClose}
            size="lg"
          >
            <WarehouseForm
              warehouse={selectedWarehouse}
              onClose={handleModalClose}
            />
          </Modal>

          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setWarehouseToDelete(null);
            }}
            onConfirm={confirmDelete}
            title="Видалити склад"
            message={`Ви впевнені, що хочете видалити склад "${warehouseToDelete?.name}"? Ця дія незворотна і також видалить всі пов'язані дані (зони складу, запаси товарів тощо).`}
            confirmText="Видалити"
            cancelText="Скасувати"
            variant="danger"
            isLoading={deleteLoading}
          />
        </>
      )}
    </div>
  );
};

export default WarehousePage;