import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[Kairos ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 32,
            fontFamily: 'system-ui, sans-serif',
            color: '#1e2428',
            backgroundColor: '#ecefee',
            minHeight: '100vh',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#e5e8e4',
              padding: 16,
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.5,
              maxHeight: '60vh',
              overflow: 'auto',
            }}
          >
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
            {this.state.errorInfo?.componentStack
              ? `\n\nComponent Stack:${this.state.errorInfo.componentStack}`
              : ''}
          </pre>
          <button
            type="button"
            style={{
              marginTop: 16,
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#0f4e57',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
