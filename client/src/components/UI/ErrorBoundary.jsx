import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[PokéBattle] Error caught by boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#050b18',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cairo', sans-serif", color: '#fff', gap: 16,
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ color: '#EF9A9A', margin: 0 }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: 'rgba(255,255,255,.5)', margin: 0, fontSize: 13 }}>
            {this.state.error?.message || 'خطأ مجهول'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: 12, padding: '10px 28px', borderRadius: 12,
              background: 'rgba(79,195,247,.15)', border: '1px solid rgba(79,195,247,.3)',
              color: '#4FC3F7', fontFamily: "'Cairo',sans-serif",
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            🔄 إعادة تحميل
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}