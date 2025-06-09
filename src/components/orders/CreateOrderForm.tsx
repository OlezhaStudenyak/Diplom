import React, { useState, useEffect } from 'react';
import { useInventoryStore } from '../../store/inventoryStore';
import { useOrderStore } from '../../store/orderStore';
import { useRouteStore } from '../../store/routeStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Modal from '../ui/Modal';
import Map, { Marker, Source, Layer, LineLayer } from "react-map-gl";
import { MapPin, Plus, Minus, Trash2, AlertTriangle } from 'lucide-react';
import "mapbox-gl/dist/mapbox-gl.css";

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

const CreateOrderForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { products, loading: productsLoading, fetchProducts } = useInventoryStore();
  const { createOrder, addOrderItem, loading, error } = useOrderStore();
  const { optimizeRoute, optimizedRoute, loading: routeLoading, error: routeError } = useRouteStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  
  const [formData, setFormData] = useState({
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    shippingCountry: 'Україна',
    notes: ''
  });
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [customerCoordinates, setCustomerCoordinates] = useState<[number, number] | null>(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, [fetchProducts, fetchWarehouses]);

  const handleAddItem = () => {
    if (products.length === 0) return;
    
    const firstProduct = products[0];
    
    setOrderItems(prev => [...prev, {
      productId: firstProduct.id,
      quantity: 1,
      unitPrice: firstProduct.price
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: number) => {
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: value } : item
    ));
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? {
        ...item,
        productId,
        unitPrice: product.price
      } : item
    ));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
  };

  const geocodeAddress = async () => {
    // Створюємо більш детальну адресу для кращого геокодування
    const addressParts = [
      formData.shippingAddress,
      formData.shippingCity,
      formData.shippingState,
      formData.shippingCountry
    ].filter(Boolean);
    
    const fullAddress = addressParts.join(', ');
    
    try {
      setGeocodingLoading(true);
      
      const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      if (!mapboxToken) {
        throw new Error('Mapbox access token не налаштований');
      }

      // Використовуємо більш специфічні параметри для України
      const geocodingUrl = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(fullAddress) + '.json');
      geocodingUrl.searchParams.set('access_token', mapboxToken);
      geocodingUrl.searchParams.set('country', 'ua'); // Обмежуємо пошук Україною
      geocodingUrl.searchParams.set('language', 'uk'); // Українська мова
      geocodingUrl.searchParams.set('limit', '5'); // Збільшуємо кількість результатів
      geocodingUrl.searchParams.set('types', 'address,poi'); // Типи місць для пошуку
      
      console.log('Geocoding URL:', geocodingUrl.toString());
      console.log('Searching for address:', fullAddress);
      
      const response = await fetch(geocodingUrl.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      if (data.features && data.features.length > 0) {
        // Беремо найкращий результат
        const bestMatch = data.features[0];
        const [lng, lat] = bestMatch.center;
        
        console.log('Found coordinates:', { lat, lng });
        console.log('Place name:', bestMatch.place_name);
        
        setCustomerCoordinates([lng, lat]);
        return [lng, lat];
      }
      
      throw new Error('Адресу не знайдено. Спробуйте ввести більш детальну адресу.');
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    } finally {
      setGeocodingLoading(false);
    }
  };

  const handleShowMap = async () => {
    try {
      setErrorMessage('');
      setShowError(false);
      
      // Перевіряємо, чи заповнені обов'язкові поля
      if (!formData.shippingAddress.trim()) {
        throw new Error('Введіть адресу доставки');
      }
      
      if (!formData.shippingCity.trim()) {
        throw new Error('Введіть місто доставки');
      }
      
      if (orderItems.length === 0) {
        throw new Error('Додайте товари до замовлення');
      }
      
      const coords = await geocodeAddress();
      
      if (coords && orderItems.length > 0) {
        // Оптимізуємо маршрут для першого товару
        const firstItem = orderItems[0];
        try {
          await optimizeRoute({
            orderId: '', // Буде встановлено після створення замовлення
            deliveryAddress: {
              latitude: coords[1],
              longitude: coords[0]
            },
            productId: firstItem.productId,
            quantity: firstItem.quantity
          });
        } catch (routeOptimizationError) {
          console.warn('Route optimization failed, but showing map anyway:', routeOptimizationError);
          // Продовжуємо показувати карту навіть якщо оптимізація маршруту не вдалася
        }
      }
      setShowMap(true);
    } catch (error) {
      console.error('Error in handleShowMap:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Помилка при визначенні координат адреси');
      setShowError(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);
    setErrorMessage('');
    
    try {
      if (orderItems.length === 0) {
        throw new Error('Додайте хоча б один товар до замовлення');
      }

      // Перевіряємо обов'язкові поля адреси
      if (!formData.shippingAddress.trim() || !formData.shippingCity.trim()) {
        throw new Error('Заповніть всі обов\'язкові поля адреси');
      }

      // Створюємо замовлення
      const orderId = await createOrder(formData);
      
      // Додаємо товари до замовлення
      for (const item of orderItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        // Знаходимо склад з найбільшою кількістю товару
        // В реальній реалізації тут має бути логіка вибору оптимального складу
        const defaultWarehouse = warehouses.find(w => w.status === 'active');
        if (!defaultWarehouse) {
          throw new Error('Немає доступних складів');
        }

        await addOrderItem({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          warehouseId: defaultWarehouse.id
        });
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to create order:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Помилка створення замовлення');
      setShowError(true);
    }
  };

  const routeLayer: LineLayer = {
    id: 'route',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#1E40AF',
      'line-width': 4,
      'line-opacity': 0.8
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-semibold text-neutral-900">
            Нове замовлення
          </h2>
        </div>

        {showError && (
          <Alert 
            variant="error" 
            title="Помилка створення замовлення" 
            className="mb-6"
            onClose={() => setShowError(false)}
          >
            {errorMessage || error}
          </Alert>
        )}

        <div className="space-y-4">
          <h3 className="font-medium text-neutral-900">Товари</h3>
          
          {orderItems.map((item, index) => (
            <div key={index} className="flex gap-4 items-start p-4 bg-neutral-50 rounded-lg">
              <div className="flex-1">
                <Select
                  value={item.productId}
                  onChange={(e) => handleProductChange(index, e.target.value)}
                  options={products.map(p => ({
                    value: p.id,
                    label: `${p.name} (₴${p.price})`
                  }))}
                  fullWidth
                />
              </div>
              
              <div className="w-32">
                <div className="flex items-center">
                  <button
                    type="button"
                    className="p-1 hover:bg-neutral-200 rounded"
                    onClick={() => handleQuantityChange(index, Math.max(1, item.quantity - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                    className="w-16 text-center border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    className="p-1 hover:bg-neutral-200 rounded"
                    onClick={() => handleQuantityChange(index, item.quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              
              <div className="w-24 text-right font-medium">
                ₴{(item.quantity * item.unitPrice).toLocaleString()}
              </div>
              
              <button
                type="button"
                className="p-1 hover:bg-neutral-200 rounded text-error-600"
                onClick={() => handleRemoveItem(index)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          <Button
            type="button"
            variant="secondary"
            icon={<Plus size={18} />}
            onClick={handleAddItem}
            fullWidth
          >
            Додати товар
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-neutral-900">Адреса доставки</h3>
          
          <Input
            label="Адреса *"
            value={formData.shippingAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
            required
            fullWidth
            placeholder="вул. Хрещатик, 22"
            helperText="Введіть повну адресу з назвою вулиці та номером будинку"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Місто *"
              value={formData.shippingCity}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingCity: e.target.value }))}
              required
              fullWidth
              placeholder="Київ"
            />
            
            <Input
              label="Область *"
              value={formData.shippingState}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingState: e.target.value }))}
              required
              fullWidth
              placeholder="Київська область"
            />
          </div>
          
          <Input
            label="Поштовий індекс"
            value={formData.shippingPostalCode}
            onChange={(e) => setFormData(prev => ({ ...prev, shippingPostalCode: e.target.value }))}
            fullWidth
            placeholder="01001"
          />

          {import.meta.env.VITE_MAPBOX_ACCESS_TOKEN && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleShowMap}
              disabled={!formData.shippingAddress || !formData.shippingCity || orderItems.length === 0}
              isLoading={geocodingLoading || routeLoading}
              fullWidth
            >
              Показати маршрут доставки
            </Button>
          )}
        </div>

        <Input
          label="Примітки до замовлення"
          as="textarea"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          fullWidth
        />

        <div className="border-t border-neutral-200 pt-4 mt-6">
          <div className="flex items-center justify-between mb-6">
            <span className="font-medium text-neutral-900">Загальна сума:</span>
            <span className="text-xl font-semibold text-neutral-900">
              ₴{calculateTotal().toLocaleString()}
            </span>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              isLoading={loading || productsLoading}
            >
              Оформити замовлення
            </Button>
          </div>
        </div>
      </form>

      {import.meta.env.VITE_MAPBOX_ACCESS_TOKEN && (
        <Modal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          size="xl"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Маршрут доставки</h3>
            
            {routeError && (
              <Alert variant="warning" title="Увага">
                Не вдалося розрахувати оптимальний маршрут: {routeError}. 
                Показано пряму лінію до адреси доставки.
              </Alert>
            )}
            
            {optimizedRoute && (
              <div className="flex gap-4 text-sm text-neutral-600">
                <span>Орієнтовний час: {Math.round(optimizedRoute.duration / 60)} хв</span>
                <span>Відстань: {(optimizedRoute.distance / 1000).toFixed(1)} км</span>
                <span>Склад: {optimizedRoute.warehouseName}</span>
              </div>
            )}
            
            <div className="h-[500px] rounded-lg overflow-hidden">
              <Map
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                initialViewState={{
                  longitude: customerCoordinates ? customerCoordinates[0] : 30.5234,
                  latitude: customerCoordinates ? customerCoordinates[1] : 50.4501,
                  zoom: customerCoordinates ? 14 : 10
                }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
              >
                {customerCoordinates && (
                  <Marker
                    longitude={customerCoordinates[0]}
                    latitude={customerCoordinates[1]}
                  >
                    <div className="text-error-600">
                      <MapPin size={24} />
                    </div>
                  </Marker>
                )}

                {optimizedRoute && optimizedRoute.route && (
                  <Source type="geojson" data={{ type: 'Feature', geometry: optimizedRoute.route.geometry, properties: {} }}>
                    <Layer {...routeLayer} />
                  </Source>
                )}
              </Map>
            </div>

            {!customerCoordinates && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-warning-800 text-sm font-medium mb-2">
                      Підказка для кращого геокодування:
                    </p>
                    <ul className="text-warning-700 text-sm space-y-1 ml-4 list-disc">
                      <li>Введіть повну адресу з назвою вулиці та номером будинку</li>
                      <li>Використовуйте українські назви міст: "Київ", "Львів", "Одеса"</li>
                      <li>Вкажіть область: "Київська область", "Львівська область"</li>
                    </ul>
                    <p className="text-warning-700 text-sm mt-2 font-medium">
                      Приклад: вул. Хрещатик, 22, Київ, Київська область
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default CreateOrderForm;