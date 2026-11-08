import type { EnquiryRequest, Product } from '@catalogue/contracts';
import type { EmailMessage } from '../domain/mailer';
import { escapeHtml } from '../lib/escape-html';

/** Strips CR/LF so nothing can break out of an email header. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function htmlRow(label: string, value: string): string {
  return `<tr><th align="left">${label}</th><td>${escapeHtml(value)}</td></tr>`;
}

/**
 * Builds the sales notification. Every user- or source-supplied value is HTML-escaped,
 * and the message keeps its line breaks without allowing markup.
 */
export function buildEnquiryEmail(
  enquiry: EnquiryRequest,
  product: Product,
  salesInbox: string,
): EmailMessage {
  const phone = enquiry.phone || 'Not provided';
  const rows = [
    htmlRow('Product', `${product.title} (id ${product.id})`),
    htmlRow('Name', enquiry.name),
    htmlRow('Email', enquiry.email),
    htmlRow('Phone', phone),
  ].join('');
  const messageHtml = escapeHtml(enquiry.message).replace(/\r?\n/g, '<br>');

  return {
    to: salesInbox,
    replyTo: enquiry.email,
    subject: singleLine(`New enquiry: ${product.title}`),
    text: [
      `Product: ${product.title} (id ${product.id})`,
      `Name: ${enquiry.name}`,
      `Email: ${enquiry.email}`,
      `Phone: ${phone}`,
      '',
      enquiry.message,
    ].join('\n'),
    html: `<h2>New product enquiry</h2><table>${rows}</table><h3>Message</h3><p>${messageHtml}</p>`,
  };
}
