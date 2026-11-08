import type { EmailMessage, Mailer } from '../domain/mailer';

/** Records sent messages. Set `failWith` to simulate a delivery failure. */
export class FakeMailer implements Mailer {
  readonly sent: EmailMessage[] = [];
  failWith: Error | undefined;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}
