import { useSearchParams } from 'react-router';
import { useSearchProducts } from '../../api/queries';
import { ProductGrid } from '../../components/ProductGrid';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryStates';
import { useDocumentTitle } from '../../lib/use-document-title';

export function SearchPage() {
  const [params] = useSearchParams();
  const term = (params.get('q') ?? '').trim();
  const { data: products, isLoading, isError, error, refetch } = useSearchProducts(term);
  useDocumentTitle(term ? `Search: ${term}` : 'Search');

  if (!term) {
    return (
      <EmptyState title="Search the catalogue">
        <p>Enter a word or phrase in the search bar above.</p>
      </EmptyState>
    );
  }

  return (
    <>
      <h1>Search results for “{term}”</h1>
      {isLoading && <LoadingState label="Searching…" />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {products && (
        <p role="status">
          {products.length} {products.length === 1 ? 'product' : 'products'} found
        </p>
      )}
      {products?.length === 0 && (
        <EmptyState title={`No products match “${term}”`}>
          <p>Try a different word, or browse a category.</p>
        </EmptyState>
      )}
      {products && products.length > 0 && (
        <ProductGrid products={products} label="Search results" />
      )}
    </>
  );
}
