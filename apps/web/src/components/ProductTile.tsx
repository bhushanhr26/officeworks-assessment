import type { Product } from '@catalogue/contracts';
import { Link } from 'react-router';
import { formatPrice, ratingLabel } from '../lib/format';
import styles from './ProductTile.module.css';

/**
 * The whole tile is one link to the product page (one tab stop, one accessible name).
 * The image is decorative here (alt=""): the title in the same link already names it, and
 * a matching alt would make screen readers read the title twice. The detail page has full alt text.
 */
export function ProductTile({ product }: { product: Product }) {
  return (
    <article className={styles.tile}>
      <Link to={`/products/${encodeURIComponent(product.id)}`} className={styles.link}>
        <img className={styles.image} src={product.imageUrl} alt="" loading="lazy" />
        <h3 className={styles.title}>{product.title}</h3>
      </Link>
      <p className={styles.price}>{formatPrice(product.price, product.currency)}</p>
      <p className={styles.rating}>
        <span aria-hidden="true">
          ★ {product.rating.average.toFixed(1)} ({product.rating.count})
        </span>
        <span className="visually-hidden">
          {ratingLabel(product.rating.average, product.rating.count)}
        </span>
      </p>
    </article>
  );
}
