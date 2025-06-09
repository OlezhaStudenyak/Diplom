import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Select from '../ui/Select';
import { Mail, Lock, User } from 'lucide-react';
import type { UserRole } from '../../types';

const SignupForm: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [showError, setShowError] = useState(false);
  
  const { signup, loading, error } = useAuthStore();
  const navigate = useNavigate();
  
  const roleOptions = [
    { value: 'customer', label: 'Клієнт' },
    { value: 'warehouse_worker', label: 'Працівник складу' },
    { value: 'logistician', label: 'Логіст' },
    { value: 'manager', label: 'Менеджер' },
    { value: 'driver', label: 'Водій' },
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);
    
    try {
      await signup(email, password, firstName, lastName, role);
      navigate('/');
    } catch (err) {
      setShowError(true);
    }
  };
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-neutral-200 max-w-md w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">Створити акаунт</h1>
        <p className="mt-2 text-neutral-600">Зареєструйтеся, щоб почати роботу з LogistiTrack</p>
      </div>
      
      {error && showError && (
        <Alert 
          variant="error" 
          title="Помилка реєстрації" 
          className="mb-6"
          onClose={() => setShowError(false)}
        >
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ім'я"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
            required
            placeholder="Іван"
            leftIcon={<User size={18} />}
          />
          
          <Input
            label="Прізвище"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            required
            placeholder="Петренко"
            leftIcon={<User size={18} />}
          />
        </div>
        
        <Input
          label="Електронна пошта"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          placeholder="ваша.пошта@приклад.com"
          leftIcon={<Mail size={18} />}
        />
        
        <Input
          label="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          placeholder="••••••••"
          leftIcon={<Lock size={18} />}
          helperText="Мінімум 8 символів"
        />
        
        <Select
          label="Тип акаунту"
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          fullWidth
          required
        />
        
        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            isLoading={loading}
          >
            Створити акаунт
          </Button>
        </div>
      </form>
      
      <div className="mt-6 text-center text-sm">
        <span className="text-neutral-600">Вже маєте акаунт?</span>{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
          Увійти
        </Link>
      </div>
    </div>
  );
};

export default SignupForm;