/** Minimal logging port; `console` satisfies it. Never log enquiry contents (PII). */
export type Logger = Pick<Console, 'info' | 'warn' | 'error'>;
