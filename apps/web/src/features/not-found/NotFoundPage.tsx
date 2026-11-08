import { Link } from 'react-router';
import { useDocumentTitle } from '../../lib/use-document-title';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <>
      <h1>Page not found</h1>
      <Link to="/">Back to home</Link>
    </>
  );
}
