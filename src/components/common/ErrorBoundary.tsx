import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Викликаємо callback якщо він переданий
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Якщо передано кастомний fallback, використовуємо його
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-error-100 mb-6">
              <AlertTriangle className="h-8 w-8 text-error-600" />
            </div>
            
            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
              Щось пішло не так
            </h1>
            
            <p className="text-neutral-600 mb-6">
              Виникла неочікувана помилка в додатку. Спробуйте перезавантажити сторінку або повернутися на головну.
            </p>
            
            {/* Показуємо детальну інформацію про помилку в режимі розробки */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-neutral-100 p-4 rounded-md mb-6 text-left">
                <summary className="cursor-pointer font-medium text-neutral-800 mb-2">
                  Деталі помилки (тільки в режимі розробки)
                </summary>
                <div className="text-sm font-mono text-neutral-700 space-y-2">
                  <div>
                    <strong>Помилка:</strong>
                    <pre className="whitespace-pre-wrap break-words mt-1">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack trace:</strong>
                      <pre className="whitespace-pre-wrap break-words mt-1 text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component stack:</strong>
                      <pre className="whitespace-pre-wrap break-words mt-1 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                icon={<RefreshCw size={16} />}
                fullWidth
              >
                Спробувати знову
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="secondary"
                icon={<RefreshCw size={16} />}
                fullWidth
              >
                Перезавантажити сторінку
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="ghost"
                icon={<Home size={16} />}
                fullWidth
              >
                На головну сторінку
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;