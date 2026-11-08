import { z } from 'zod';
import { ProductIdSchema } from './product';

export const EnquiryRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email').max(254),
  // Optional; an empty form field arrives as ''.
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s-]{6,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  message: z.string().trim().min(1, 'Message is required').max(2000),
  productId: ProductIdSchema,
  // Honeypot: real users never fill this. Accepted here; the service drops filled ones silently.
  website: z.string().max(500).default(''),
});

export const EnquiryAcceptedSchema = z.object({ status: z.literal('accepted') });

export type EnquiryRequest = z.infer<typeof EnquiryRequestSchema>;
export type EnquiryRequestInput = z.input<typeof EnquiryRequestSchema>;
export type EnquiryAccepted = z.infer<typeof EnquiryAcceptedSchema>;
