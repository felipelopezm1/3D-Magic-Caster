import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            fontFamily: '"Press Start 2P", system-ui, monospace',
            padding: 24,
            maxWidth: 640,
            margin: "40px auto",
            background: "#fff",
            border: "3px solid #000",
            boxShadow: "4px 4px 0 #000",
            fontSize: "8px",
            lineHeight: 1.8,
          }}
        >
          <h1 style={{ fontSize: "10px", marginTop: 0 }}>Something went wrong</h1>
          <p style={{ wordBreak: "break-word" }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              border: "2px solid #000",
              background: "#000",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: "8px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
