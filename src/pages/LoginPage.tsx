import React from 'react';
import { Truck } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="bg-primary-700 text-white p-8 flex items-center justify-center md:w-1/2">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-12 w-12 bg-white rounded-md flex items-center justify-center">
              <Truck size={32} className="text-primary-700" />
            </div>
            <h1 className="text-3xl font-display font-bold">LogistiTrack</h1>
          </div>
          
          <h2 className="text-2xl font-display font-semibold leading-tight mb-4">
            Оптимізуйте управління складом та логістикою
          </h2>
          
          <p className="text-primary-100 mb-6">
            Відстежуйте запаси на різних локаціях, оптимізуйте маршрути доставки та отримуйте аналітику в реальному часі.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-600 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Відстеження в реальному часі</h3>
              <p className="text-sm text-primary-100">Моніторинг запасів та відправлень з миттєвими оновленнями.</p>
            </div>
            <div className="bg-primary-600 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Оптимізація маршрутів</h3>
              <p className="text-sm text-primary-100">Скорочення часу доставки завдяки AI-плануванню.</p>
            </div>
            <div className="bg-primary-600 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Розумний склад</h3>
              <p className="text-sm text-primary-100">Сповіщення про низькі запаси та автоматизація замовлень.</p>
            </div>
            <div className="bg-primary-600 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Аналітична панель</h3>
              <p className="text-sm text-primary-100">Прийняття рішень на основі детальної звітності.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Login Form */}
      <div className="bg-neutral-50 p-8 flex items-center justify-center md:w-1/2">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;