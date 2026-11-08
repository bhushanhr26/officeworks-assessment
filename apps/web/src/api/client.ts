import {
  ApiErrorSchema,
  CategoryProductsSchema,
  CategorySchema,
  EnquiryAcceptedSchema,
  ProductSchema,
} from '@catalogue/contracts';
import type {
  Category,
  CategoryProducts,
  EnquiryAccepted,
  EnquiryRequestInput,
  ErrorCode,
  Product,
} from '@catalogue/contracts';
import type { ZodType } from 'zod';

export type ApiErrorKind = ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorKind,
    message: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiRequestError';
  }
}

/** Everything the UI can ask of the backend. The ONLY module that calls fetch. */
export interface ApiClient {
  getFeaturedProducts(): Promise<Product[]>;
  getCategories(): Promise<Category[]>;
  getCategoryProducts(slug: string): Promise<CategoryProducts>;
  searchProducts(term: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  submitEnquiry(enquiry: EnquiryRequestInput): Promise<EnquiryAccepted>;
}

export function createApiClient(
  baseUrl: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): ApiClient {
  async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch (cause) {
      throw new ApiRequestError('NETWORK_ERROR', 'Could not reach the server.', undefined, {
        cause,
      });
    }

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const apiError = ApiErrorSchema.safeParse(body);
      if (apiError.success) {
        const { code, message } = apiError.data.error;
        throw new ApiRequestError(code, message, response.status);
      }
      throw new ApiRequestError(
        'INVALID_RESPONSE',
        `Unexpected response (${response.status}).`,
        response.status,
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRequestError(
        'INVALID_RESPONSE',
        'Unexpected response from the server.',
        undefined,
        {
          cause: parsed.error,
        },
      );
    }
    return parsed.data;
  }

  const id = (value: string) => encodeURIComponent(value);

  return {
    getFeaturedProducts: () => request('/api/products/featured', ProductSchema.array()),
    getCategories: () => request('/api/categories', CategorySchema.array()),
    getCategoryProducts: (slug) =>
      request(`/api/categories/${id(slug)}/products`, CategoryProductsSchema),
    searchProducts: (term) =>
      request(`/api/products?search=${encodeURIComponent(term)}`, ProductSchema.array()),
    getProduct: (productId) => request(`/api/products/${id(productId)}`, ProductSchema),
    submitEnquiry: (enquiry) =>
      request('/api/enquiries', EnquiryAcceptedSchema, {
        method: 'POST',
        body: JSON.stringify(enquiry),
      }),
  };
}
