# Product Catalogue: Spec

## 1. Goal

A product catalogue PoC: customers can browse, search, view products and send an enquiry. It is a **foundation, not a throwaway**. The three parts the brief expects to change sit behind seams:

| Expected to change                        | Seam                                             |
| ----------------------------------------- | ------------------------------------------------ |
| Product data source (Fake Store today)    | `ProductRepository` port                         |
| Email provider (Mailpit today, SES later) | `Mailer` port                                    |
| Look and feel                             | `apps/web/src/styles/tokens.css` (CSS variables) |

## 2. Stack and layout

npm workspaces monorepo, TypeScript everywhere.

```
apps/web            React + TS SPA built with Vite; React Router; TanStack Query
apps/api            Node + Express + TS
packages/contracts  Zod schemas + inferred types shared by web and api
```

- The web app is a **static client** with no server code. All data comes from our API.
- Web runs on Vite's default **:5173** and the API on **:3000**.
- Vitest is the test runner everywhere and shares the web app's Vite config.

## 3. API architecture (ports & adapters)

```
routes  →  services  →  ports (interfaces)  ←  adapters
 thin       rules        ProductRepository     FakeStoreProductRepository
                         Mailer                SmtpMailer
```

- **`ProductRepository`**: `getAll()`, `getById(id)`, `getCategories()`.
- **`FakeStoreProductRepository`**:
  - Fetches from Fake Store and validates the upstream response with Zod.
  - Maps it into **our** `Product` model.
  - Fetches `/products` once with a timeout (`UPSTREAM_TIMEOUT_MS`) and caches it in memory with a TTL (`PRODUCT_CACHE_TTL_MS`). `getById` and `getCategories` are served from that cached list. Failures are not cached.
  - Network errors, timeouts, non-2xx responses, bad JSON and schema mismatches all become a typed `UpstreamError`.
  - Slugifies categories, e.g. `"men's clothing"` → `mens-clothing`.
  - Fake Store types and URLs never leave `adapters/fakestore/`.
- **`Mailer`**: `send({ to, subject, html, text })`.
- **`SmtpMailer`**: Nodemailer. It points at Mailpit locally. The SES SMTP endpoint can be swapped in later via env, with no code change.
- **`CatalogueService`** holds the featured, category split/sort and search rules. **`EnquiryService`** handles the honeypot, builds the email (HTML-escaped) and sends it to the sales inbox.
- **Routes**: parse the input with Zod, call a service, and respond. No business logic.
- **`config.ts`**: Zod-validates `process.env` at startup and exits non-zero on failure. Config is never read from anywhere else.
- **Composition root**: `server.ts` (`buildApp`) picks the real adapters from config. `createApp(deps)` in `app.ts` builds the Express app from ports, so tests inject an in-memory repository and a fake mailer. ESLint enforces that only `server.ts` imports adapters.
- **Resilience**: the Fake Store adapter skips and logs individual invalid records, so one bad record can't take down the catalogue; only a non-list response, or one with no valid records, is a 502. Featured ids missing from the source are skipped and logged.
- **Operations**: every request gets an `X-Request-Id` (a well-formed incoming one is reused) and one log line (method, path without query string, status, duration). 5xx errors are logged with the request id. On SIGTERM/SIGINT the server stops accepting connections, lets in-flight requests finish, and force-exits after 8s.

## 4. Domain model (`packages/contracts`)

```ts
Category         { slug: string; name: string }
Product          { id: string /* opaque; Fake Store's numeric id as a string */; title: string; description: string; price: number;
                   currency: "AUD"; category: Category; imageUrl: string;
                   rating: { average: number; count: number } }
CategoryProducts { topRated: Product[]; others: Product[] }
EnquiryRequest   { name; email; phone?; message; productId: string; website: string /* honeypot */ }
ApiError         { error: { code: ErrorCode; message: string } }
```

## 5. Endpoints

| Method & path                        | Input                           | Success                   | Notes                                                                                                                    |
| ------------------------------------ | ------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /health`                        | –                               | `200 {status:"ok"}`       | Liveness only, no upstream call                                                                                          |
| `GET /api/products/featured`         | –                               | `200 Product[≤5]`         | IDs from `apps/api/config/featured.json` (exactly 5 unique, checked at startup). Ids missing from the source are skipped |
| `GET /api/categories`                | –                               | `200 Category[]`          |                                                                                                                          |
| `GET /api/categories/:slug/products` | slug                            | `200 CategoryProducts`    | `topRated` = top 3 by `rating.average` (ties broken by `count`); `others` = the rest, same sort. Unknown slug → 404      |
| `GET /api/products?search=term`      | `search` (trimmed, 1–100 chars) | `200 Product[]`           | Case-insensitive substring match on title, description and category name. Empty or missing → 400                         |
| `GET /api/products/:id`              | id `[A-Za-z0-9_-]{1,64}`        | `200 Product`             | Unknown → 404                                                                                                            |
| `POST /api/enquiries`                | `EnquiryRequest`                | `202 {status:"accepted"}` | Rate-limited. Unknown `productId` → 404                                                                                  |

Fake Store has no search endpoint, so search filters the cached `getAll()` in `CatalogueService`. Search results keep the source order. In category sorting, rating ties are broken by `count`, then by title, so the order is stable.

Product ids are **opaque strings**, so a future source can use SKUs or UUIDs without changing the contract.

## 6. Error model

All errors use the shape `{ error: { code, message } }`. One error middleware maps typed domain errors to HTTP status codes:

| Code               | HTTP | When                                                                    |
| ------------------ | ---- | ----------------------------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Zod parse failure on params, query or body                              |
| `NOT_FOUND`        | 404  | Unknown product id or category slug                                     |
| `RATE_LIMITED`     | 429  | Enquiry rate limit hit                                                  |
| `UPSTREAM_ERROR`   | 502  | Fake Store unreachable, non-2xx or schema mismatch; also mailer failure |
| `INTERNAL`         | 500  | Anything unexpected. Stack traces are never sent to the client          |

## 7. Security

- `helmet`, plus a JSON body limit of `10kb`. The web server (nginx) sends a strict CSP (`connect-src` is the API origin, set at build time from `VITE_API_URL`), plus `nosniff`, `X-Frame-Options: DENY` and a referrer policy.
- CORS allowlist from `CORS_ORIGINS` (comma-separated).
- `express-rate-limit` on `POST /api/enquiries`: per IP, 5 per 15 minutes by default (env). It runs before validation, so invalid and honeypot requests count too. The store is in memory, so each instance has its own count; scaling out needs a shared store (Redis/ElastiCache). Behind an ALB, set `TRUST_PROXY_HOPS` so limits apply per client and not per load balancer.
- Honeypot field `website`. It is checked **before** validation, so any non-empty value gets the same `202` and nothing is sent. Bots get no signal, whatever else they submitted. Drops are logged without PII.
- All user input, and the product title, is HTML-escaped in the email's HTML part, with newlines turned into `<br>`. The plain-text part carries the raw text, which mail clients never render as HTML.
- Headers: the subject uses the product title with CR/LF stripped. `Reply-To` is the customer's email, so sales can reply directly; it is safe because the email has passed Zod validation, which rejects whitespace and CR/LF, and Nodemailer encodes headers.
- Unknown `productId` → 404 before any email is sent.
- SMTP has 10s connection, greeting and socket timeouts. `SMTP_REQUIRE_TLS=true` refuses to send without STARTTLS; set it for any real provider (SES on 587), so credentials can't be sent in plain text. Mailpit has no TLS, so it defaults to `false` locally.
- Product `imageUrl` must be `https`; this blocks `javascript:`/`data:` URLs and mixed content from any future source. Any mailer failure → 502 with a generic message; details go to the server log only.
- The API fails at startup if `SALES_INBOX` or `MAIL_FROM` is missing; there are no silent defaults for where business email goes.
- No secrets in git. `.env.example` lists every variable. SMTP credentials are optional and only used for SES or real SMTP.

## 8. Web

**Pages**

| Route                   | Content                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `/`                     | Featured products grid                                        |
| `/category/:slug`       | "Top rated" section (3) + "More in this category"             |
| `/search?q=`            | Results grid; the term is echoed back                         |
| `/products/:id`         | Details + **Enquire** button (a link styled as a button)      |
| `/products/:id/enquire` | Enquiry form → "Thank you" state (focus moves to the heading) |

- **Routing**: React Router; routes are declared in one place (`src/App.tsx`).
- **Layout**: a header on every page with a search form (input + button) and category links from `/api/categories`.
- **States**: every data view has explicit loading, empty and error states.
- **API client**: `apps/web/src/api/client.ts` is the only module that calls `fetch`. It parses every response with the contracts schemas. Its base URL comes from `VITE_API_URL`. The web app **never** calls fakestoreapi.com. The client is injected through React context, so tests use a stub. API errors become a typed `ApiRequestError`.
- **Data**: TanStack Query hooks wrap the client.
- **Styling**: CSS variables in `src/styles/tokens.css`. Components use tokens only, never raw colours or spacing.
- **Form**: validated client-side with the shared Zod schema; the server validates again. Errors are linked with `aria-describedby`/`aria-invalid`, and focus moves to the first invalid field. The honeypot is off-screen, `aria-hidden` and `tabindex=-1`.
- **Queries**: TanStack Query; 4xx errors are never retried, 5xx and network errors are retried once.
- **Accessibility**: skip link, labelled search (`role=search`, native form, so Enter works), each tile is one link (decorative `alt=""` image, since the title names it), full alt text on the detail page, a page title per route.

## 9. Testing (Vitest)

**API**

- `CatalogueService` unit tests:
  - featured, in configured order
  - category split 3 / rest, sort and ties
  - search matching on title, description and category; case-insensitivity; no match → `[]`
  - unknown slug → error
- Fake Store mapper and repository tests: field mapping, slugify, contract rejection, cache TTL, a real timeout, non-2xx, invalid JSON, skipping bad records.
- Ops tests: request id and log line, graceful shutdown (clean exit and forced exit), production wiring (`buildApp`), reading `featured.json` and `.env` from disk.
- `EnquiryService` unit tests: honeypot → no send; HTML escaping.
- Route tests with Supertest + fake repo/mailer: 200s, 400 (empty search, bad id, bad enquiry), 404, 502 (repo throws upstream error), enquiry 202 and mailer called, honeypot 202 and mailer not called.

**Web (React Testing Library)**

- Search flow: type a term, click Search, see only the matching results; plus the empty and error states.
- Enquiry form: required-field errors, then a valid submit shows "Thank you"; a server error shows a retryable message, and retrying succeeds.
- The UI tests run on the **production** query client (real retry policy, zero delay): a transient 502 recovers automatically, and a 404 is never retried. An error boundary catches render errors.

## 10. Local run

```
docker compose up --build
```

No setup is needed: Compose has a default for every setting. A root `.env` (from `.env.example`) only overrides them.

| Service    | URL                                              |
| ---------- | ------------------------------------------------ |
| Web        | http://localhost:5173                            |
| API        | http://localhost:3000                            |
| Mailpit UI | http://localhost:8025 (SMTP :1025 internal only) |

All images are public, and no accounts or paid services are needed. Both images are multi-stage builds that run as non-root on read-only filesystems. The API is a plain Node image (ECS/Fargate or App Runner). The web app is static files served by unprivileged nginx (or S3 + CloudFront). `VITE_API_URL` is baked in at build time; runtime config injection is a next step. Moving email to SES only needs SMTP env changes.

## 11. Acceptance criteria → where it's satisfied

| Brief requirement                                                            | Implementation                                                                                          | Test                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Home**: the 5 chosen "top rated" products are shown                        | `featured.json` → `GET /api/products/featured` → `/`                                                    | Service: featured order; Route: 200 with 5                              |
| **Category**: clicking a category link shows top rated + additional products | Header links → `/category/:slug` → `GET /api/categories/:slug/products`                                 | Service: split/sort; Route: 200 and unknown slug 404                    |
| **Search**: a term + Search button shows only matching products              | Header form → `/search?q=` → `GET /api/products?search=`                                                | Service: matching; Route: 400 on empty; Web RTL: search flow            |
| **Product**: clicking a tile opens the details page                          | `ProductTile` link → `/products/:id` → `GET /api/products/:id`                                          | Route: 200 and 404; Web RTL: tile click opens details                   |
| **Enquiry**: submitting sends email to the sales inbox and shows "Thank you" | Enquire → `/products/:id/enquire` → `POST /api/enquiries` → `EnquiryService` → `Mailer` → `SALES_INBOX` | Route: 202 + mailer called; Web RTL: Thank you; manual check in Mailpit |
| No direct Fake Store calls from the client                                   | `client.ts` only targets `VITE_API_URL`; Fake Store code lives only in the adapter                      | ESLint rule bans `fakestoreapi` strings outside the adapter             |
| AWS-compatible infra                                                         | Containerised API; SMTP → SES                                                                           | –                                                                       |
| Runs locally in under 10 minutes                                             | `docker compose up`                                                                                     | Manual                                                                  |
| No secrets committed                                                         | `.env.example`, `.env` gitignored                                                                       | Review                                                                  |
| No paid services                                                             | Fake Store + Mailpit                                                                                    | –                                                                       |

## 12. Open assumptions

1. Home-page "top rated" means **5 hand-picked product IDs** (config), not computed from ratings.
2. Category-page "top rated" means the **top 3 by average rating**, with count as the tie-break. Everything else counts as "additional".
3. Search is server-side, case-insensitive substring matching on title, description and category. It has no pagination, ranking or fuzzy matching (the catalogue has about 20 items).
4. An enquiry is about **one product**. Name, email and message are required; phone is optional.
5. The sales inbox is one address from env (`SALES_INBOX`). Enquiries are not stored and there is no customer confirmation email.
6. Prices are shown as AUD exactly as Fake Store returns them, with no conversion.
7. There is no auth, cart or checkout.
8. If Fake Store is down, the API returns 502 and the UI shows an error state. There is no fixture fallback (noted as a next step).
9. Web stack: **React + Vite SPA**. The brief allows any React web app. Next.js was considered and dropped: SSR adds nothing for a client-only catalogue PoC, and it would add a second server.
10. English only and desktop-first responsive. Accessibility basics are in scope: labels, focus and alt text.
11. Product **images** load in the browser straight from Fake Store's image host (`fakestoreapi.com/img/...`), using the `imageUrl` our API returns. They are static assets, not API calls: all product **data** goes through our backend, so constraint 2 holds. A real source would serve images from its own CDN (e.g. S3 + CloudFront); proxying images through the API is the alternative if this is unacceptable.
