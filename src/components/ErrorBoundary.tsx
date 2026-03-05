import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center gap-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {this.props.fallbackTitle || 'Algo salió mal'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Ocurrió un error inesperado. Podés reintentar o volver al inicio.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Reintentar
            </Button>
            {this.props.showHomeButton !== false && (
              <Button variant="default" size="sm" onClick={this.handleGoHome} className="gap-1.5">
                <Home className="w-3.5 h-3.5" />
                Ir al inicio
              </Button>
            )}
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 text-xs text-left bg-muted p-3 rounded-md max-w-lg overflow-auto text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
