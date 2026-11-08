import { useMutation, useQuery } from '@tanstack/react-query';
import type { EnquiryRequestInput } from '@catalogue/contracts';
import { useApiClient } from './api-context';

export const queryKeys = {
  featured: ['products', 'featured'] as const,
  categories: ['categories'] as const,
  category: (slug: string) => ['categories', slug, 'products'] as const,
  search: (term: string) => ['products', 'search', term] as const,
  product: (id: string) => ['products', 'detail', id] as const,
};

export function useFeaturedProducts() {
  const api = useApiClient();
  return useQuery({ queryKey: queryKeys.featured, queryFn: () => api.getFeaturedProducts() });
}

export function useCategories() {
  const api = useApiClient();
  return useQuery({ queryKey: queryKeys.categories, queryFn: () => api.getCategories() });
}

export function useCategoryProducts(slug: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.category(slug),
    queryFn: () => api.getCategoryProducts(slug),
  });
}

/** Disabled for a blank term: the API rejects it, and there is nothing to show. */
export function useSearchProducts(term: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: queryKeys.search(term),
    queryFn: () => api.searchProducts(term),
    enabled: term.length > 0,
  });
}

export function useProduct(id: string) {
  const api = useApiClient();
  return useQuery({ queryKey: queryKeys.product(id), queryFn: () => api.getProduct(id) });
}

export function useSubmitEnquiry() {
  const api = useApiClient();
  return useMutation({ mutationFn: (enquiry: EnquiryRequestInput) => api.submitEnquiry(enquiry) });
}
