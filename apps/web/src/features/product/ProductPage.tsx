import { Link, useParams } from 'react-router';
import { isNotFound } from '../../api/error-message';
import { useProduct } from '../../api/queries';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryStates';
import { formatPrice, ratingLabel } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './ProductPage.module.css';

export function ProductPage() {
  const id = useParams().id ?? '';
  const { data: product, isPending, isError, error, refetch } = useProduct(id);
  useDocumentTitle(product?.title);

  if (isPending) return <LoadingState label="Loading product…" />;
  if (isError && isNotFound(error)) {
    return (
      <EmptyState title="Product not found">
        <p>
          <Link to="/">Back to featured products</Link>
        </p>
      </EmptyState>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <article className={styles.layout}>
      <img className={styles.image} src={product.imageUrl} alt={product.title} />
      <div className={styles.details}>
        <p className={styles.category}>
          <Link to={`/category/${product.category.slug}`}>{product.category.name}</Link>
        </p>
        <h1>{product.title}</h1>
        <p className={styles.price}>{formatPrice(product.price, product.currency)}</p>
        <p className={styles.rating}>{ratingLabel(product.rating.average, product.rating.count)}</p>
        <p>{product.description}</p>
        <Link to={`/products/${encodeURIComponent(product.id)}/enquire`} className="button">
          Enquire
        </Link>
      </div>
    </article>
  );
}
