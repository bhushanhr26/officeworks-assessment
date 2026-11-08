import { EnquiryRequestSchema } from '@catalogue/contracts';
import type { EnquiryRequestInput } from '@catalogue/contracts';

export const ENQUIRY_FIELDS = ['name', 'email', 'phone', 'message'] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];
export type EnquiryValues = Record<EnquiryField, string>;
export type FieldErrors = Partial<Record<EnquiryField, string>>;

export const EMPTY_VALUES: EnquiryValues = { name: '', email: '', phone: '', message: '' };

type ValidationResult =
  { ok: true; payload: EnquiryRequestInput } | { ok: false; errors: FieldErrors };

function isEnquiryField(value: unknown): value is EnquiryField {
  return ENQUIRY_FIELDS.some((field) => field === value);
}

/** Same shared schema the API uses, so client and server agree on what is valid. */
export function validateEnquiry(
  values: EnquiryValues,
  productId: string,
  website: string,
): ValidationResult {
  const payload: EnquiryRequestInput = { ...values, productId, website };
  const result = EnquiryRequestSchema.safeParse(payload);
  if (result.success) {
    return { ok: true, payload };
  }
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (isEnquiryField(field) && !errors[field]) {
      errors[field] = issue.code === 'invalid_type' ? 'This field is required' : issue.message;
    }
  }
  return { ok: false, errors };
}
