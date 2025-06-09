import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { Mail, Lock } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(false);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setShowError(true);
    }
  };
  
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-neutral-200 max-w-md w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-display font-bold text-neutral-900">Увійти в LogistiTrack</h1>
        <p className="mt-2 text-neutral-600">Введіть свої облікові дані для доступу до акаунту</p>
      </div>
      
      {error && showError && (
        <Alert 
          variant="error" 
          title="Помилка входу" 
          className="mb-6"
          onClose={() => setShowError(false)}
        >
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
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
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
              Запам'ятати мене
            </label>
          </div>
          
          <div className="text-sm">
            <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
              Забули пароль?
            </Link>
          </div>
        </div>
        
        <Button
          type="submit"
          fullWidth
          isLoading={loading}
        >
          Увійти
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm">
        <span className="text-neutral-600">Немає акаунту?</span>{' '}
        <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
          Зареєструватися
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;