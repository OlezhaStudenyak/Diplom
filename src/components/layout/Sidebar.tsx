import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  PackageOpen, 
  Warehouse, 
  Truck, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Users,
  X,
  LogOut
} from 'lucide-react';
import Button from '../ui/Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isWarehouseWorker = user?.role === 'warehouse_worker';
  const isLogistician = user?.role === 'logistician';
  const isDriver = user?.role === 'driver';
  const isCustomer = user?.role === 'customer';

  const navItems = [
    {
      name: 'Панель керування',
      path: '/',
      icon: <LayoutDashboard size={20} />,
      showFor: ['admin', 'warehouse_worker', 'logistician', 'manager', 'driver', 'customer'],
    },
    {
      name: 'Товари',
      path: '/products',
      icon: <PackageOpen size={20} />,
      showFor: ['admin', 'warehouse_worker', 'manager', 'customer'],
    },
    {
      name: 'Склади',
      path: '/warehouses',
      icon: <Warehouse size={20} />,
      showFor: ['admin', 'warehouse_worker', 'manager'],
    },
    {
      name: 'Логістика',
      path: '/logistics',
      icon: <Truck size={20} />,
      showFor: ['admin', 'logistician', 'manager', 'driver'],
    },
    {
      name: 'Замовлення',
      path: '/orders',
      icon: <ShoppingCart size={20} />,
      showFor: ['admin', 'warehouse_worker', 'logistician', 'manager', 'customer'],
    },
    {
      name: 'Звіти',
      path: '/reports',
      icon: <BarChart3 size={20} />,
      showFor: ['admin', 'manager'],
    },
    {
      name: 'Користувачі',
      path: '/users',
      icon: <Users size={20} />,
      showFor: ['admin'],
    },
    {
      name: 'Налаштування',
      path: '/settings',
      icon: <Settings size={20} />,
      showFor: ['admin', 'manager'],
    },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.showFor.includes(user?.role || '')
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-neutral-900 bg-opacity-50 z-20 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      <aside 
        className={`fixed md:sticky top-0 left-0 bottom-0 w-64 bg-white border-r border-neutral-200 z-30 md:z-0 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-transform duration-300 h-screen flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold text-xl text-primary-800">
            <div className="h-8 w-8 bg-primary-600 rounded-md flex items-center justify-center">
              <Truck size={20} className="text-white" />
            </div>
            <span>LogistiTrack</span>
          </Link>
          <button 
            onClick={onClose}
            className="md:hidden rounded-md p-1.5 hover:bg-neutral-100"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors group ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span className={`mr-3 ${
                      isActive ? 'text-primary-500' : 'text-neutral-500 group-hover:text-primary-500'
                    }`}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center mb-4">
            <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-neutral-800 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            fullWidth 
            icon={<LogOut size={16} />} 
            onClick={handleLogout}
          >
            Вийти
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;