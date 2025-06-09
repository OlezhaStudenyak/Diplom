import React from 'react';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import NotificationCenter from '../notifications/NotificationCenter';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user } = useAuthStore();
  
  return (
    <header className="bg-white border-b border-neutral-200 h-16 flex items-center px-4 md:px-6">
      <button
        onClick={onMenuClick}
        className="md:hidden mr-4 p-1.5 rounded-md hover:bg-neutral-100"
      >
        <Menu size={20} className="text-neutral-600" />
      </button>
      
      <div className="flex-1"></div>
      
      <div className="flex items-center ml-4">
        <NotificationCenter />
        
        <div className="ml-4 flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;