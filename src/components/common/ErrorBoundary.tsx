import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  isChunkLoadError: boolean;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  title?: string;
  message?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Checks if the thrown error was caused by a failed dynamic import / chunk load.
 * This commonly happens when a new release is deployed and old asset hashes no longer exist on the CDN.
 */
function isChunkLoadingError(error: Error | null): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return (
    name.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  );
}

/**
 * Robust Error Boundary class component that catches runtime rendering
 * and module loading failures in children trees.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Optional error logging hook
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (err) {
        console.error('Error executing onError callback in ErrorBoundary:', err);
      }
    }

    // Diagnostic console logging in dev and production
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys || [];

      // If any reset key changed (e.g. route location changed), clear the error automatically
      const hasChanged =
        prevKeys.length !== currentKeys.length ||
        currentKeys.some((key, index) => !Object.is(key, prevKeys[index]));

      if (hasChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (err) {
        console.error('Error executing onReset in ErrorBoundary:', err);
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const isChunkError = isChunkLoadingError(error);

      // Custom fallback provided by consumer
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
          isChunkLoadError: isChunkError,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default high-fidelity, accessible UI matching site design system
      return (
        <main
          id="error-boundary-content"
          role="alert"
          aria-live="assertive"
          className="container narrow page"
          style={{
            padding: '4rem 1rem 3rem',
            textAlign: 'center',
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Warning Icon Badge */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <p className="eyebrow" style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>
            {isChunkError ? 'Update Detected' : 'Application Notice'}
          </p>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            {this.props.title || (isChunkError ? 'New Version Available' : 'Something went wrong loading this page')}
          </h1>

          <p
            className="lead"
            style={{
              maxWidth: '36rem',
              margin: '0 auto 2rem',
              color: 'var(--muted)',
              fontSize: '1.05rem',
              lineHeight: 1.6,
            }}
          >
            {this.props.message ||
              (isChunkError
                ? 'A recent update was deployed or your internet connection briefly dipped while loading page assets. Refreshing the browser will load the latest version.'
                : 'An unexpected error occurred while rendering this component. You can retry loading or return to the home page.')}
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.875rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
            }}
          >
            <button
              type="button"
              onClick={this.handleReload}
              className="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh Page
            </button>

            <button
              type="button"
              onClick={this.resetErrorBoundary}
              className="button button-secondary"
            >
              Try Again
            </button>

            <Link
              to="/"
              onClick={this.resetErrorBoundary}
              className="button button-secondary"
            >
              Return Home
            </Link>
          </div>

          {/* Quick Navigation Alternatives */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              padding: '1.25rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              maxWidth: '32rem',
              width: '100%',
              textAlign: 'left',
              marginBottom: '2rem',
            }}
          >
            <h2
              style={{
                margin: '0 0 0.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Explore other sections:
            </h2>
            <ul
              style={{
                paddingLeft: '1.25rem',
                margin: 0,
                lineHeight: 1.7,
                fontSize: '0.9rem',
                color: 'var(--muted)',
              }}
            >
              <li>
                <Link to="/work/" onClick={this.resetErrorBoundary}>
                  Jawed’s Experience &amp; Skills
                </Link>
              </li>
              <li>
                <Link to="/tools/" onClick={this.resetErrorBoundary}>
                  Free IT &amp; Engineering Tools
                </Link>
              </li>
              <li>
                <Link to="/notes/" onClick={this.resetErrorBoundary}>
                  Technical Notes &amp; Troubleshooting
                </Link>
              </li>
              <li>
                <Link to="/contact/" onClick={this.resetErrorBoundary}>
                  Contact Jawed
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Diagnostics (Expandable) */}
          <details
            style={{
              maxWidth: '32rem',
              width: '100%',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: 'var(--muted)',
              borderTop: '1px solid var(--line)',
              paddingTop: '1rem',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 500,
                userSelect: 'none',
                outline: 'none',
              }}
            >
              Technical details &amp; diagnostics
            </summary>
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.875rem',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <strong>{error.name}:</strong> {error.message}
              {this.state.errorInfo?.componentStack && (
                <div style={{ marginTop: '0.5rem', opacity: 0.8 }}>
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>
          </details>
        </main>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for ErrorBoundary that automatically attaches
 * current router location pathname to resetKeys, so navigating to
 * another route resets any existing error automatically.
 */
export const RouteErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'resetKeys'>> = (props) => {
  const location = useLocation();
  return <ErrorBoundary resetKeys={[location.pathname]} {...props} />;
};
