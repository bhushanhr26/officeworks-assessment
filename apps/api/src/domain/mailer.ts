export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Lets sales reply straight to the customer. Must be a validated address. */
  replyTo?: string;
}

/** Port for outbound email. Adapters throw UpstreamError when delivery fails. */
export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
