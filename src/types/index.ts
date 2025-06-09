// User roles
export type UserRole = 'admin' | 'warehouse_worker' | 'logistician' | 'manager' | 'driver' | 'customer';

// User interface
export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  profileImage?: string;
  createdAt: string;
}

// Unit type for products
export type UnitType = 'piece' | 'kilogram' | 'liter';

// Product category interface
export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Product interface
export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  category?: ProductCategory;
  price: number;
  cost: number;
  unit_type: UnitType;
  unit_value: number;
  minimum_stock: number;
  maximum_stock: number;
  stock?: number;
  created_at: string;
  updated_at: string;
}

// Warehouse interface
export interface Warehouse {
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
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// Warehouse zone interface
export interface WarehouseZone {
  id: string;
  warehouseId: string;
  name: string;
  zoneType: string;
  capacity: number;
  currentUtilization: number;
  temperature?: number;
  humidity?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// Inventory level interface
export interface InventoryLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minimumQuantity: number;
  maximumQuantity: number;
  createdAt: string;
  updatedAt: string;
}

// Order status type
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Order interface
export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    firstName: string;
    lastName: string;
  };
}

// Order item interface
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  product?: {
    name: string;
    sku: string;
    unitType: UnitType;
    unitValue: number;
  };
  warehouse?: {
    name: string;
  };
}

// Order status history interface
export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes?: string;
  changedBy: string;
  createdAt: string;
  changedByUser?: {
    firstName: string;
    lastName: string;
  };
}

// Vehicle interface
export interface Vehicle {
  id: string;
  licensePlate: string;
  model: string;
  make: string;
  year: number;
  capacity: number;
  status: 'available' | 'in_delivery' | 'maintenance' | 'out_of_service';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Vehicle location interface
export interface VehicleLocation {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
  route_progress?: number;
}

// Delivery route interface
export interface DeliveryRoute {
  id: string;
  vehicleId?: string;
  driverId?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  totalDistance: number;
  totalStops: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  vehicle?: Vehicle;
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Delivery stop interface
export interface DeliveryStop {
  id: string;
  routeId: string;
  orderId?: string;
  sequenceNumber: number;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  plannedArrival?: string;
  actualArrival?: string;
  latitude: number;
  longitude: number;
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Dashboard metrics interface
export interface DashboardMetrics {
  totalProducts: number;
  lowStockItems: number;
  pendingOrders: number;
  activeDeliveries: number;
  inventoryValue: number;
  warehouseUtilization: number;
  monthlyShipments: Array<{ month: string; count: number }>;
  categoryCounts: Array<{ category: string; count: number }>;
}

// Route optimization types
export interface RouteOptimizationRequest {
  orderId: string;
  deliveryAddress: {
    latitude: number;
    longitude: number;
  };
  productId: string;
  quantity: number;
}

export interface RouteOptimizationResponse {
  warehouseId: string;
  warehouseName: string;
  distance: number;
  duration: number;
  route: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: number[][];
    };
  };
  alternativeRoutes: Array<{
    warehouseId: string;
    distance: number;
    duration: number;
  }>;
}