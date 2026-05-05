import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Nome curto da seção (ex.: "Mapa Geoespacial") — exibido como contexto */
  section?: string;
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  failedAt: Date | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, failedAt: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, failedAt: new Date() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.section ? ` · ${this.props.section}` : ""}]`,
      error,
      info,
    );
  }

  handleReset = () => this.setState({ hasError: false, error: null, failedAt: null });

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    const { section, title, description } = this.props;
    const { error, failedAt } = this.state;

    return (
      <div
        role="alert"
        aria-live="polite"
        className="bg-card border border-destructive/30 rounded-sm shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[280px]"
      >
        <div className="size-11 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
          <AlertTriangle className="size-5 text-destructive" />
        </div>

        {section && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-sm mb-2">
            {section}
          </span>
        )}

        <h3 className="font-semibold text-base mb-1">
          {title ?? "Não foi possível carregar esta seção"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-3">
          {description ??
            "Ocorreu um erro inesperado ao renderizar este componente. As demais seções do Centro de Comando continuam disponíveis."}
        </p>

        {error?.message && (
          <p
            className="text-xs font-mono text-destructive bg-destructive/5 border border-destructive/20 px-3 py-1.5 rounded mb-2 max-w-md truncate"
            title={error.message}
          >
            {error.name}: {error.message}
          </p>
        )}

        {failedAt && (
          <p className="text-[11px] font-mono text-muted-foreground mb-4">
            Falhou às {failedAt.toLocaleTimeString("pt-BR")}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Tentar novamente
          </Button>
          <Button variant="ghost" size="sm" onClick={this.handleReload} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Recarregar página
          </Button>
        </div>
      </div>
    );
  }
}
