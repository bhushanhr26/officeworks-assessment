import type { Product } from '@catalogue/contracts';
import { ProductTile } from './ProductTile';
import styles from './ProductGrid.module.css';

export function ProductGrid({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
