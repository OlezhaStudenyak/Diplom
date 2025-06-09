import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { User, Mail, Shield, Camera } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Here you would update the user profile
      // await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Помилка при оновленні профілю');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Адміністратор',
      warehouse_worker: 'Працівник складу',
      logistician: 'Логіст',
      manager: 'Менеджер',
      driver: 'Водій',
      customer: 'Клієнт'
    };
    return roles[role] || role;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">
          Налаштування
        </h1>
        <p className="text-neutral-500 mt-1">
          Управління вашим профілем та налаштуваннями акаунту
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Settings */}
        <div className="lg:col-span-2">
          <Card title="Інформація профілю">
            {success && (
              <Alert variant="success\" className="mb-6">
                Профіль успішно оновлено
              </Alert>
            )}

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ім'я"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  leftIcon={<User size={18} />}
                  fullWidth
                />
                
                <Input
                  label="Прізвище"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  leftIcon={<User size={18} />}
                  fullWidth
                />
              </div>

              <Input
                label="Електронна пошта"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                leftIcon={<Mail size={18} />}
                fullWidth
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={loading}
                >
                  Зберегти зміни
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Account Info */}
        <div className="space-y-6">
          <Card title="Інформація акаунту">
            <div className="space-y-4">
              <div className="flex items-center justify-center mb-6">
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xl">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
              </div>

              <div className="text-center">
                <h3 className="font-medium text-neutral-900">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-sm text-neutral-500">{user?.email}</p>
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Shield size={16} />
                  <span>Роль: {getRoleLabel(user?.role || '')}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Безпека">
            <div className="space-y-4">
              <Button
                variant="secondary"
                fullWidth
              >
                Змінити пароль
              </Button>
              
              <Button
                variant="ghost"
                fullWidth
              >
                Налаштування безпеки
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;