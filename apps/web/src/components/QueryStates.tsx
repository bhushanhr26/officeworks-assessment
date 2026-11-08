import type { ReactNode } from 'react';
import { errorMessage } from '../api/error-message';
import styles from './QueryStates.module.css';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className={styles.muted} role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.box}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className={`${styles.box} ${styles.error}`} role="alert">
      <h2>Sorry, something went wrong</h2>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="button button-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
