import { useFeaturedProducts } from '../../api/queries';
import { ProductGrid } from '../../components/ProductGrid';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryStates';
import { useDocumentTitle } from '../../lib/use-document-title';

export function HomePage() {
  useDocumentTitle(undefined);
  const { data: products, isPending, isError, error, refetch } = useFeaturedProducts();

  return (
    <>
      <h1>Featured products</h1>
      {isPending && <LoadingState label="Loading featured products…" />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {products?.length === 0 && (
        <EmptyState title="No featured products right now">
          <p>Browse a category above or search for a product.</p>
        </EmptyState>
      )}
      {products && products.length > 0 && (
        <ProductGrid products={products} label="Featured products" />
      )}
    </>
  );
}
