import { useEffect } from 'react';

const SITE_NAME = 'Product Catalogue';

/** Sets a distinct page title so screen-reader users hear where they landed. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
