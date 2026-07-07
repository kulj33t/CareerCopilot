import { Component } from 'react';

// Catches render-time errors anywhere below it. Without this, a crash in any
// component whites out the entire app with no recovery path. Logs the error
// plus the React component stack so a user bug report is actually debuggable.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In a prod app this would ship to Sentry / Datadog / wherever. For dev,
    // the console trace is enough to diagnose.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 32,
          background: 'var(--bg)',
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: '100%',
            padding: 40,
            background: 'var(--bg-elev-1)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            textAlign: 'center',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'var(--danger)',
              marginBottom: 14,
            }}
          >
            UNEXPECTED ERROR
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 42,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              marginBottom: 14,
            }}
          >
            Something <em style={{ color: 'var(--lime)' }}>broke.</em>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 10 }}>
            Sorry — a render error crashed this screen. Your data is safe.
          </p>
          <p
            style={{
              color: 'var(--text-dim)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              marginBottom: 28,
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={this.reset}>
              Try again
            </button>
            <button className="btn btn-primary" onClick={this.reload}>
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
