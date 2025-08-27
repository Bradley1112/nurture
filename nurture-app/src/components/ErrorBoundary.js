import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <h1>🌱 Oops! Something went wrong</h1>
            <p style={{ opacity: 0.9, marginBottom: 'var(--space-6)' }}>
              We encountered an unexpected error. Please refresh the page to try again.
            </p>
            
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  background: 'var(--leaf-gradient)',
                  color: 'var(--deep-forest)',
                  border: 'none',
                  padding: 'var(--space-4) var(--space-8)',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details style={{ 
                textAlign: 'left', 
                backgroundColor: 'var(--deep-forest)', 
                padding: 'var(--space-4)', 
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: 'var(--space-2)' }}>
                  🔍 Error Details (Development Mode)
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;