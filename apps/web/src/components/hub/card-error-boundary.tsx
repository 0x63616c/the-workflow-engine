import { Component, type ErrorInfo, type ReactNode } from "react";

interface CardErrorBoundaryProps {
  children: ReactNode;
}

interface CardErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export class CardErrorBoundary extends Component<CardErrorBoundaryProps, CardErrorBoundaryState> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  state: CardErrorBoundaryState = {
    hasError: false,
    retryCount: 0,
  };

  static getDerivedStateFromError(): Partial<CardErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CardErrorBoundary] Widget crash:", error, info.componentStack);
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
        retryCount: prev.retryCount + 1,
      }));
    }, RETRY_DELAY_MS);
  }

  handleRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.setState({ hasError: false, retryCount: 0 });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const exhaustedRetries = this.state.retryCount >= MAX_AUTO_RETRIES;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/50">
        <span className="text-xs">{exhaustedRetries ? "Widget unavailable" : "Recovering..."}</span>
        {exhaustedRetries && (
          <button
            type="button"
            onClick={this.handleRetry}
            className="text-xs underline underline-offset-2"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
}
