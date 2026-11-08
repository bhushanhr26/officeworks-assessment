import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { isNotFound } from '../../api/error-message';
import { useProduct } from '../../api/queries';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryStates';
import { useDocumentTitle } from '../../lib/use-document-title';
import { EnquiryForm } from './EnquiryForm';
import { ThankYou } from './ThankYou';

export function EnquiryPage() {
  const id = useParams().id ?? '';
  const { data: product, isPending, isError, error, refetch } = useProduct(id);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  useDocumentTitle(product ? `Enquire about ${product.title}` : 'Enquire');

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

  if (submittedEmail !== null) {
    return <ThankYou product={product} email={submittedEmail} />;
  }

  return (
    <>
      <p>
        <Link to={`/products/${encodeURIComponent(product.id)}`}>← Back to product</Link>
      </p>
      <h1>Enquire about {product.title}</h1>
      <p>Leave your details and our sales team will get back to you.</p>
      <EnquiryForm product={product} onSubmitted={setSubmittedEmail} />
    </>
  );
}
