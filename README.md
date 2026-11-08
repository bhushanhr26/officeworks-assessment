# Product Catalogue

A product catalogue proof of concept. Customers can browse featured products and categories, search, view a product, and send an enquiry that emails the sales inbox.

It is built as a **foundation, not a throwaway**. The three things the business expects to change each sit behind one seam:

| Expected to change | Seam                                              | To swap it                                              |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------- |
| Product data       | `ProductRepository` port (`apps/api/src/domain`)  | Add an adapter, wire it in `apps/api/src/index.ts`      |
| Email provider     | `Mailer` port; SMTP adapter                       | Change `SMTP_*` env vars (e.g. AWS SES); no code change |
| Look and feel      | Design tokens in `apps/web/src/styles/tokens.css` | Edit tokens; components use only `var(--*)`             |

More detail: [SPEC.md](SPEC.md) (spec, acceptance-criteria mapping, assumptions) and [CLAUDE.md](CLAUDE.md) (rules for AI agents working in this repo).

## Stack and why

| Layer   | Choice                                                     | Why                                                                                                                                                                                                              |
| ------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client  | **React + TypeScript**, Vite, React Router, TanStack Query | The brief asks for a React web app. A static SPA is the simplest thing that works: no SSR server to run, and it deploys to S3 + CloudFront. TanStack Query handles loading, error and retry states consistently. |
| Backend | **Node + TypeScript**, Express                             | Small and widely known. Ports & adapters keep the Fake Store API and SMTP behind interfaces, so routes stay thin and services are unit-testable.                                                                 |
| Shared  | `packages/contracts` (Zod)                                 | One definition of `Product`, `Enquiry` and the error shape. It validates on both sides and gives inferred TypeScript types, so the client and API can't drift apart.                                             |
| Email   | Nodemailer → **Mailpit** locally                           | No account needed to try it. Mailpit gives a real inbox UI. In production, the same SMTP code points at AWS SES.                                                                                                 |
| Run     | Docker Compose                                             | One command; it only needs Docker.                                                                                                                                                                               |

## Quick start (Docker)

Prerequisite: **Docker Desktop** (or Docker Engine with Compose v2). No accounts or API keys are needed.

```bash
docker compose up --build
```

The first build takes a few minutes. Then open:

| What                      | URL                                                                      |
| ------------------------- | ------------------------------------------------------------------------ |
| **Web app**               | http://localhost:5173                                                    |
| **API**                   | http://localhost:3000 (e.g. http://localhost:3000/api/products/featured) |
| **Sales inbox** (Mailpit) | http://localhost:8025                                                    |

There is nothing to configure. Every setting has a working default. To override settings, copy `.env.example` to `.env` (gitignored) and edit it.

Stop with `Ctrl+C`, then `docker compose down`.

## Running without Docker

Prerequisites: **Node 24 LTS** (22.12+ works; `nvm use` reads `.nvmrc`) and an SMTP catcher on port 1025. You can install Mailpit with `brew install mailpit && mailpit`, or run only that container with `docker compose up mailpit`.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # the API refuses to start without SALES_INBOX and MAIL_FROM
npm run dev                               # API on :3000 and web on :5173, with hot reload
```

`apps/web/.env.example` is optional. The web app defaults to `http://localhost:3000`.

## Tests and checks

```bash
npm test            # Vitest across all workspaces (contracts, api, web)
npm run typecheck   # tsc --noEmit everywhere
npm run lint        # ESLint (also blocks any Fake Store URL outside the API adapter)
npm run format:check
```

- **API**: unit tests for `CatalogueService`, `EnquiryService`, the Fake Store mapper and repository (timeouts, bad upstream data, cache), the email builder (HTML escaping) and config. Route tests use Supertest with an in-memory repository and a fake mailer, and cover 200/202/400/404/429/502/500, CORS and security headers.
- **Web**: React Testing Library tests of the real app with a stubbed API client. They cover the search flow (mouse and keyboard), the enquiry form (validation, Thank you, retry after a server error, honeypot), the featured, category and product pages, and loading, empty and error states.

## Configuration

### API (`apps/api/.env.example`)

| Variable                       | Default                 | Purpose                                                                                 |
| ------------------------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| `SALES_INBOX`                  | **required**            | Where enquiries are sent (Compose default: `sales@example.com`)                         |
| `MAIL_FROM`                    | **required**            | Sender address (Compose default: `Product Catalogue <no-reply@example.com>`)            |
| `SMTP_HOST` / `SMTP_PORT`      | `localhost` / `1025`    | SMTP server (Compose: `mailpit:1025`)                                                   |
| `SMTP_SECURE`                  | `false`                 | `true` only for implicit TLS (port 465)                                                 |
| `SMTP_REQUIRE_TLS`             | `false`                 | Refuse to send without STARTTLS. **Set `true` for any real provider** (e.g. SES on 587) |
| `SMTP_USER` / `SMTP_PASS`      | unset                   | SMTP credentials, e.g. SES. Set both or neither. **Never commit them.**                 |
| `CORS_ORIGINS`                 | `http://localhost:5173` | Comma-separated browser origins allowed to call the API                                 |
| `PORT`                         | `3000`                  | API port                                                                                |
| `NODE_ENV`                     | `development`           | `development` / `test` / `production`                                                   |
| `TRUST_PROXY_HOPS`             | `0`                     | Proxies in front of the API (e.g. `1` behind an ALB); used for rate-limit IPs           |
| `ENQUIRY_RATE_LIMIT_MAX`       | `5`                     | Enquiries per client IP per window                                                      |
| `ENQUIRY_RATE_LIMIT_WINDOW_MS` | `900000`                | Rate-limit window (15 minutes)                                                          |
| `FAKESTORE_BASE_URL`           | adapter default         | Product source base URL                                                                 |
| `UPSTREAM_TIMEOUT_MS`          | `5000`                  | Product source timeout (then 502)                                                       |
| `PRODUCT_CACHE_TTL_MS`         | `300000`                | In-memory product cache TTL; `0` disables it                                            |
| `FEATURED_CONFIG_PATH`         | `config/featured.json`  | The 5 curated home-page product ids                                                     |

The API validates config at startup and exits with a clear message if anything is invalid.

### Web (`apps/web/.env.example`)

| Variable       | Default                 | Purpose                                                                                       |
| -------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:3000` | Our API's URL **as seen from the browser**. Inlined at build time, so never put secrets here. |

### Choosing the featured products

Edit `apps/api/config/featured.json` (exactly 5 unique ids), then restart the API, or run `docker compose up --build api` if you use Docker.

## Project structure

```
apps/
  api/
    config/featured.json        curated home-page product ids
    src/
      domain/                   ports (ProductRepository, Mailer, Logger) and typed errors
      adapters/
        fakestore/              the ONLY place Fake Store is known: schemas, mapper, cached repository
        in-memory/              in-memory repository (tests, offline use)
        smtp/                   Nodemailer SMTP mailer
      services/                 business rules: CatalogueService, EnquiryService, email builder
      routes/                   thin Express routers (parse → call service → respond)
      http/                     error handler, rate limiter, async wrapper
      config.ts                 Zod-validated env (the only reader of process.env)
      app.ts                    createApp(deps): Express app built from ports (tests inject fakes)
      server.ts                 composition root: real adapters from config, graceful shutdown
      index.ts                  entry point
    Dockerfile
  web/
    src/
      api/                      client.ts (the only fetch), query hooks, error messages
      components/               Header, SearchForm, CategoryNav, ProductTile/Grid, state views
      features/                 pages: home, category, search, product, enquiry, not-found
      styles/tokens.css         design tokens
    Dockerfile, nginx.conf
packages/
  contracts/                    shared Zod schemas and types (Product, Category, Enquiry, ApiError)
docker-compose.yml              api + web + mailpit
```

## Security notes

- **Headers and CORS:** the API sets security headers with helmet and allows CORS only for origins in `CORS_ORIGINS`.
- **Request limits:** request bodies are capped at 10kb, and enquiries are rate-limited per IP.
- **Spam protection:** the enquiry form has a hidden honeypot field. Bots that fill it get the same 202 response, but no email is sent.
- **Email content:** user input is HTML-escaped in the email body. Headers can't be injected. Error responses never include upstream or internal details.
- **Web server:** strict Content-Security-Policy (`connect-src` limited to the API origin), `nosniff`, `X-Frame-Options: DENY`.
- **SMTP:** set `SMTP_REQUIRE_TLS=true` for real providers, so credentials are never sent in plain text.
- **Operations:** every response has an `X-Request-Id` that matches the API log line. On SIGTERM the API stops cleanly (no killed in-flight requests on deploy).
- **Architecture:** the boundaries are enforced by `npm run lint`: only the composition root imports adapters, and only the web API client calls `fetch`.
- **Containers:** both images run as non-root, on read-only filesystems, with `no-new-privileges`.
- **Secrets:** none are committed. Images are built without local `.env` files (see `.dockerignore`).

See SPEC.md §7 for the trade-offs. `npm audit` reports no production issues. One moderate advisory remains in a dev-only lint dependency (minimatch inside typescript-eslint, no fix released); it only processes our own lint globs.
