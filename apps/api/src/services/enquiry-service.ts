import { EnquiryRequestSchema } from '@catalogue/contracts';
import { DomainError, NotFoundError, UpstreamError } from '../domain/errors';
import type { Mailer } from '../domain/mailer';
import type { ProductRepository } from '../domain/product-repository';
import type { Logger } from '../domain/logger';
import { buildEnquiryEmail } from './enquiry-email';

export type EnquiryOutcome = 'sent' | 'dropped';

/** True when the hidden "website" field has any value. Humans never see it, so they never fill it. */
function isHoneypotFilled(input: unknown): boolean {
  if (typeof input !== 'object' || input === null || !('website' in input)) return false;
  const { website } = input;
  return website !== undefined && website !== null && website !== '';
}

export class EnquiryService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly mailer: Mailer,
    private readonly salesInbox: string,
    private readonly logger: Logger,
  ) {}

  /**
   * Takes the raw body. The honeypot is checked BEFORE validation, so a bot gets the same
   * 202 whatever else it sent. That gives it no signal to tune against.
   * Throws ZodError (400), NotFoundError (404) or UpstreamError (502).
   */
  async submit(input: unknown): Promise<EnquiryOutcome> {
    if (isHoneypotFilled(input)) {
      this.logger.warn('Enquiry dropped: honeypot field filled');
      return 'dropped';
    }

    const enquiry = EnquiryRequestSchema.parse(input);
    const product = await this.repository.getById(enquiry.productId);
    if (!product) {
      throw new NotFoundError(`Product "${enquiry.productId}" not found`);
    }

    try {
      await this.mailer.send(buildEnquiryEmail(enquiry, product, this.salesInbox));
    } catch (err) {
      // Any mailer failure is a dependency failure (502), even from an adapter that
      // doesn't follow the port contract.
      throw err instanceof DomainError ? err : new UpstreamError('Mailer failed', { cause: err });
    }
    return 'sent';
  }
}
