import { EventEmitter } from 'node:events';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config';
import { buildApp, registerGracefulShutdown } from './server';

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('buildApp (production wiring)', () => {
  it('builds a working app from config with the real adapters', async () => {
    const config = loadConfig({ SALES_INBOX: 'sales@shop.test', MAIL_FROM: 'x@shop.test' });
    const app = buildApp(config, ['1', '2', '3', '4', '5'], silentLogger());

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('registerGracefulShutdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(close: (cb: (err?: Error) => void) => void) {
    const signals = new EventEmitter();
    const exit = vi.fn();
    const server = { close: vi.fn(close) };
    registerGracefulShutdown(server as never, {
      logger: silentLogger(),
      signals,
      exit,
      timeoutMs: 100,
    });
    return { signals, exit, server };
  }

  it('closes the server on SIGTERM and exits 0 once in-flight requests finish', () => {
    const { signals, exit, server } = setup((cb) => cb());
    signals.emit('SIGTERM');
    expect(server.close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('forces exit 1 if closing takes too long', () => {
    vi.useFakeTimers();
    const { signals, exit } = setup(() => undefined);
    signals.emit('SIGINT');
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
