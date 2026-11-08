import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import styles from './SearchForm.module.css';

/** A native <form>, so Enter submits and the button works by keyboard without extra code. */
export function SearchForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const currentQuery = params.get('q') ?? '';
  const [term, setTerm] = useState(currentQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the box in sync when the URL changes (back/forward, links).
  useEffect(() => {
    setTerm(currentQuery);
  }, [currentQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form role="search" className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="site-search" className="visually-hidden">
        Search products
      </label>
      <input
        ref={inputRef}
        id="site-search"
        type="search"
        className={styles.input}
        placeholder="Search products"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        maxLength={100}
      />
      <button type="submit" className="button">
        Search
      </button>
    </form>
  );
}
