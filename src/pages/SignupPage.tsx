import React from 'react';
import { Truck } from 'lucide-react';
import SignupForm from '../components/auth/SignupForm';

const SignupPage: React.FC = () => {
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
            Приєднуйтесь до нашої мережі логістичних професіоналів
          </h2>
          
          <p className="text-primary-100 mb-6">
            Створіть обліковий запис для доступу до нашої потужної платформи управління складом та логістикою. Почніть оптимізувати свої операції вже сьогодні.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary-500 p-1 rounded-full mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-primary-100">Ролі для працівників складу, логістів, менеджерів та водіїв</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary-500 p-1 rounded-full mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-primary-100">Безпечний доступ до даних складу з будь-якої локації</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary-500 p-1 rounded-full mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-primary-100">Миттєві сповіщення про важливі події на складі</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary-500 p-1 rounded-full mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-primary-100">Зручний мобільний інтерфейс для управління в дорозі</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Signup Form */}
      <div className="bg-neutral-50 p-8 flex items-center justify-center md:w-1/2">
        <SignupForm />
      </div>
    </div>
  );
};

export default SignupPage;