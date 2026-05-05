import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary capturou:", error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-card border rounded-sm shadow-sm p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-base mb-1">
          {this.props.title ?? "Não foi possível carregar este componente"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-2">
          {this.props.description ??
            "Ocorreu um erro inesperado ao renderizar esta seção. O restante do Centro de Comando continua disponível."}
        </p>
        {this.state.error?.message && (
          <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded mb-4 max-w-md truncate">
            {this.state.error.message}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={this.handleReset}>
          <RefreshCw className="size-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }
}
