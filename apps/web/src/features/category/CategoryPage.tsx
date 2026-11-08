import { Link, useParams } from 'react-router';
import { isNotFound } from '../../api/error-message';
import { useCategories, useCategoryProducts } from '../../api/queries';
import { ProductGrid } from '../../components/ProductGrid';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryStates';
import { useDocumentTitle } from '../../lib/use-document-title';

export function CategoryPage() {
  const slug = useParams().slug ?? '';
  const { data, isPending, isError, error, refetch } = useCategoryProducts(slug);
  const { data: categories } = useCategories();
  const name = categories?.find((c) => c.slug === slug)?.name ?? data?.topRated[0]?.category.name;
  useDocumentTitle(name);

  if (isPending) return <LoadingState label="Loading products…" />;
  if (isError && isNotFound(error)) {
    return (
      <EmptyState title="Category not found">
        <p>
          <Link to="/">Back to featured products</Link>
        </p>
      </EmptyState>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const { topRated, others } = data;
  return (
    <>
      <h1>{name ?? 'Category'}</h1>
      {topRated.length === 0 ? (
        <EmptyState title="No products in this category yet" />
      ) : (
        <section aria-labelledby="top-rated-heading">
          <h2 id="top-rated-heading">Top rated</h2>
          <ProductGrid products={topRated} label="Top rated products" />
        </section>
      )}
      {others.length > 0 && (
        <section aria-labelledby="more-heading">
          <h2 id="more-heading">More in {name ?? 'this category'}</h2>
          <ProductGrid products={others} label="More products" />
        </section>
      )}
    </>
  );
}
