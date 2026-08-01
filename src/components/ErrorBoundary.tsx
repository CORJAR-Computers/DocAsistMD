import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Captura errores de renderizado de React y muestra una pantalla amigable. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary capturó un error:", error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-danger/10 rounded-2xl mb-4">
            <AlertTriangle className="w-8 h-8 text-danger" />
          </div>
          <h1 className="text-xl font-bold text-text mb-1">Algo salió mal</h1>
          <p className="text-sm text-text-light mb-2">
            Ocurrió un error inesperado en la aplicación.
          </p>
          <p className="text-xs text-text-muted font-mono bg-surface-dark border border-border rounded-lg p-3 mb-6 break-words text-left max-h-28 overflow-y-auto">
            {this.state.error.message || this.state.error.toString()}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => (window.location.href = "/")}>
              <Home className="w-4 h-4" /> Inicio
            </Button>
            <Button className="gap-1.5" onClick={this.reset}>
              <RotateCcw className="w-4 h-4" /> Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
