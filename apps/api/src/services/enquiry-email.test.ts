import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/product-factory';
import { buildEnquiryEmail } from './enquiry-email';

const product = makeProduct({ id: '7', title: 'Gold Ring' });
const enquiry = {
  name: 'Ada',
  email: 'ada@example.com',
  phone: '',
  message: 'Line one\nLine two',
  productId: '7',
  website: '',
};

describe('buildEnquiryEmail', () => {
  it('addresses sales, sets reply-to and names the product in the subject', () => {
    const email = buildEnquiryEmail(enquiry, product, 'sales@shop.test');

    expect(email.to).toBe('sales@shop.test');
    expect(email.replyTo).toBe('ada@example.com');
    expect(email.subject).toBe('New enquiry: Gold Ring');
    expect(email.text).toContain('Phone: Not provided');
    expect(email.html).toContain('Line one<br>Line two');
  });

  it('HTML-escapes user input so it cannot inject markup', () => {
    const email = buildEnquiryEmail(
      { ...enquiry, name: '<img src=x onerror=alert(1)>', message: '<a href="evil">click</a>' },
      product,
      'sales@shop.test',
    );

    expect(email.html).not.toContain('<img');
    expect(email.html).not.toContain('<a href');
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).toContain('&lt;a href=&quot;evil&quot;&gt;click&lt;/a&gt;');
  });

  it('escapes the product title and strips newlines from the subject', () => {
    const email = buildEnquiryEmail(
      enquiry,
      makeProduct({ id: '7', title: 'Ring <b>\r\nBcc: x@evil.test' }),
      'sales@shop.test',
    );

    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.html).toContain('Ring &lt;b&gt;');
  });
});
