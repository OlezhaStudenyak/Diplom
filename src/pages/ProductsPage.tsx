import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit, Trash2, BarChart3 } from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProductForm from '../components/products/ProductForm';
import InventoryQuantityEditor from '../components/products/InventoryQuantityEditor';
import Button from '../components/ui/Button';

const ProductsPage: React.FC = () => {
  const { products, loading, error, fetchProducts, deleteProduct } = useInventoryStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isQuantityEditorOpen, setIsQuantityEditorOpen] = useState(false);
  const [productForQuantityEdit, setProductForQuantityEdit] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const headers = [
    { key: 'name', label: 'Назва' },
    { key: 'sku', label: 'Артикул' },
    { key: 'category', label: 'Категорія' },
    { key: 'price', label: 'Ціна' },
    { key: 'stock', label: 'Запас' },
    ...(user?.role === 'warehouse_worker' ? [{ key: 'actions', label: 'Дії', className: 'text-right' }] : [])
  ];

  const handleRowClick = (product: any) => {
    if (user?.role === 'warehouse_worker') {
      setSelectedProduct(product);
      setIsModalOpen(true);
    }
  };

  const handleEditProduct = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleEditQuantity = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setProductForQuantityEdit(product);
    setIsQuantityEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setDeleteLoading(true);
      await deleteProduct(productToDelete.id);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getUnitLabel = (type: string): string => {
    switch (type) {
      case 'piece':
        return 'шт.';
      case 'kilogram':
        return 'кг';
      case 'liter':
        return 'л';
      default:
        return 'од.';
    }
  };

  const renderRow = (product: any) => {
    const baseRow = [
      <div className="font-medium text-neutral-900">{product.name}</div>,
      <div className="text-neutral-600">{product.sku}</div>,
      <Badge variant="primary" size="sm">{product.category?.name || 'Без категорії'}</Badge>,
      <div className="text-neutral-600">₴{product.price.toLocaleString()}</div>,
      <Badge
        variant={Number(product.stock) > 0 ? 'success' : 'error'}
        size="sm"
      >
        {formatStock(product)}
      </Badge>
    ];

    if (user?.role === 'warehouse_worker') {
      baseRow.push(
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<BarChart3 size={16} />}
            onClick={(e) => handleEditQuantity(e, product)}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Кількість
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Edit size={16} />}
            onClick={(e) => handleEditProduct(e, product)}
          >
            Редагувати
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Trash2 size={16} />}
            onClick={(e) => handleDeleteProduct(e, product)}
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            Видалити
          </Button>
        </div>
      );
    }

    return baseRow;
  };

  const formatStock = (product: any): string => {
    if (typeof product.stock === 'undefined') return '0.00 ' + getUnitLabel(product.unit_type);
    return `${Number(product.stock).toFixed(2)} ${getUnitLabel(product.unit_type)}`;
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  const handleQuantityEditorClose = () => {
    setIsQuantityEditorOpen(false);
    setProductForQuantityEdit(null);
    fetchProducts();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Товари</h1>
          <p className="text-neutral-500 mt-1">Управління товарами та запасами</p>
        </div>
        
        {user?.role === 'warehouse_worker' && (
          <Button
            variant="primary"
            icon={<Plus size={20} />}
            onClick={() => setIsModalOpen(true)}
          >
            Додати товар
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Пошук товарів..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>

        <Table
          headers={headers}
          data={filteredProducts}
          renderRow={renderRow}
          isLoading={loading}
          onRowClick={user?.role === 'warehouse_worker' ? handleRowClick : undefined}
          emptyState={
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Товарів не знайдено
              </h3>
              <p className="text-neutral-600">
                {user?.role === 'warehouse_worker' 
                  ? 'Додайте новий товар, щоб почати роботу'
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
            <ProductForm
              product={selectedProduct}
              onClose={handleModalClose}
            />
          </Modal>

          <Modal
            isOpen={isQuantityEditorOpen}
            onClose={handleQuantityEditorClose}
            size="md"
          >
            {productForQuantityEdit && (
              <InventoryQuantityEditor
                productId={productForQuantityEdit.id}
                productName={productForQuantityEdit.name}
                onClose={handleQuantityEditorClose}
              />
            )}
          </Modal>

          <ConfirmDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              setProductToDelete(null);
            }}
            onConfirm={confirmDelete}
            title="Видалити товар"
            message={`Ви впевнені, що хочете видалити товар "${productToDelete?.name}"? Ця дія незворотна і також видалить всі пов'язані записи про запаси.`}
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

export default ProductsPage;