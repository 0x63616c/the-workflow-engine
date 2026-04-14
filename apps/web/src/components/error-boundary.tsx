import { faro } from "@grafana/faro-web-sdk";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] React crash:", error, info.componentStack);
    const faroApi = faro.api;
    if (faroApi) {
      faroApi.pushError(error, {
        context: {
          componentStack: info.componentStack ?? "unknown",
        },
      });
    }
    this.scheduleAutoRetry();
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  scheduleAutoRetry() {
    if (this.state.retryCount >= MAX_AUTO_RETRIES) return;

    this.retryTimeout = setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        retryCount: prev.retryCount + 1,
      }));
    }, RETRY_DELAY_MS);
  }

  handleManualRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.setState({ hasError: false, error: null, retryCount: 0 });
  };

  handleFullReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const exhaustedRetries = this.state.retryCount >= MAX_AUTO_RETRIES;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-light">Something went wrong</h1>
          {!exhaustedRetries && (
            <p className="mt-2 text-sm text-muted-foreground">
              Retrying automatically ({this.state.retryCount}/{MAX_AUTO_RETRIES})...
            </p>
          )}
          {exhaustedRetries && (
            <p className="mt-2 text-sm text-muted-foreground">
              Auto-retry failed. Try manually or reload.
            </p>
          )}
        </div>
        {exhaustedRetries && (
          <div className="flex gap-4">
            <button
              type="button"
              onClick={this.handleManualRetry}
              className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={this.handleFullReload}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Reload
            </button>
          </div>
        )}
        {this.state.error && (
          <p className="max-w-md text-center font-mono text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
        )}
      </div>
    );
  }
}
