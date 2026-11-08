import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styles from './QueryStates.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defence: a render error shows a recoverable message instead of a blank page.
 * Layout keys it by route, so navigating elsewhere resets it. (React requires a class here.)
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className={`${styles.box} ${styles.error}`} role="alert">
        <h1>Sorry, something went wrong</h1>
        <p>This page failed to load. Try reloading, or go back to the home page.</p>
        <p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Reload page
          </button>{' '}
          <a href="/">Go to home page</a>
        </p>
      </div>
    );
  }
}
