import type { Product } from '@catalogue/contracts';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import styles from './ThankYou.module.css';

/** Moves focus to the heading so screen-reader users hear the confirmation. */
export function ThankYou({ product, email }: { product: Product; email: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className={styles.box} aria-labelledby="thank-you-heading">
      <h1 id="thank-you-heading" ref={headingRef} tabIndex={-1}>
        Thank you
      </h1>
      <p>
        We’ve received your enquiry about <strong>{product.title}</strong>. Our sales team will
        reply to <strong>{email}</strong> soon.
      </p>
      <p className={styles.links}>
        <Link to={`/products/${encodeURIComponent(product.id)}`}>Back to product</Link>
        <Link to="/">Continue browsing</Link>
      </p>
    </section>
  );
}
