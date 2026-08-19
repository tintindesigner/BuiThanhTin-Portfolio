import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Without this, ANY render-time error anywhere in the tree (a real one hit
// during review: a stale Lightbox index reading past the end of a shorter
// image array after a browser back/forward between case studies; also
// covers e.g. the 3D box's model failing to fetch) unmounts the whole app
// to a blank white page with no recovery — React has no default recovery
// for a thrown render, an ancestor boundary is the only mechanism for one.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught a render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            background: 'var(--cream)',
            color: 'var(--ink-black)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <p style={{ fontSize: '20px' }}>Something went wrong.</p>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            style={{
              padding: '10px 24px',
              borderRadius: '999px',
              background: 'var(--ink-black)',
              color: 'var(--cream)',
              fontFamily: 'inherit',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
