import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { UpstreamError } from '../../domain/errors';
import type { EmailMessage, Mailer } from '../../domain/mailer';

export interface SmtpOptions {
  host: string;
  port: number;
  /** true = implicit TLS (port 465). false = plain or STARTTLS (Mailpit :1025, SES :587). */
  secure: boolean;
  /** Refuse to send unless STARTTLS succeeds. Use with real providers so credentials never go in clear. */
  requireTLS: boolean;
  user?: string;
  pass?: string;
  from: string;
}

const TIMEOUT_MS = 10_000;

export function toTransportOptions(options: SmtpOptions): SMTPTransport.Options {
  return {
    host: options.host,
    port: options.port,
    secure: options.secure,
    requireTLS: options.requireTLS,
    auth: options.user && options.pass ? { user: options.user, pass: options.pass } : undefined,
    // Don't let a slow mail server hold requests open.
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  };
}

/** SMTP adapter. Mailpit locally; SES (or any SMTP provider) by changing env only. */
export class SmtpMailer implements Mailer {
  constructor(
    private readonly from: string,
    private readonly transporter: Pick<Transporter, 'sendMail'>,
  ) {}

  static fromOptions(options: SmtpOptions): SmtpMailer {
    return new SmtpMailer(options.from, nodemailer.createTransport(toTransportOptions(options)));
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, ...message });
    } catch (cause) {
      throw new UpstreamError('SMTP send failed', { cause });
    }
  }
}
