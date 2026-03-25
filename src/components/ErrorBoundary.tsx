import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              The app encountered an unexpected error. You can try to recover or
              restart the application.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-secondary/50 border border-border rounded p-3 mb-4 overflow-auto max-h-24 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
