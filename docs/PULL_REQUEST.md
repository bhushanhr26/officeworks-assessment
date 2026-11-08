# Product catalogue PoC: browse, search, product detail, enquiry by email

## Summary

A product catalogue that customers can browse, search and enquire from. It's built as a **foundation that can grow, not a throwaway prototype**.

- **Stack:**
  - Web: React + TypeScript single-page app (Vite, React Router, TanStack Query).
  - API: Node + TypeScript with Express.
  - Shared: a Zod contracts package used by both.
  - Monorepo: npm workspaces.
- **Product data:** Fake Store, sitting behind a `ProductRepository` interface. The browser only ever calls our API.
- **Email:** sent through a `Mailer` interface with an SMTP adapter. It uses Mailpit locally and can switch to AWS SES by changing env only.
- **Look and feel:** design tokens in one CSS file. No UI library.
- **Architecture rules are checked by ESLint,** not just documented: only the composition root may import adapters, and only the web app's API client may call `fetch`.

Background docs: [SPEC.md](../SPEC.md) (spec and acceptance-criteria mapping), [DECISIONS.md](../DECISIONS.md) (assumptions, cuts, how it grows), [AI_USAGE.md](../AI_USAGE.md), [CLAUDE.md](../CLAUDE.md) (agent instructions).

<!-- TODO(author): add a sentence on your stack choice in your own words. -->

## How to run

**Prerequisite:** Docker. No accounts or API keys are needed.

```bash
docker compose up --build
```

| What                   | URL                   |
| ---------------------- | --------------------- |
| Web app                | http://localhost:5173 |
| API                    | http://localhost:3000 |
| Sales inbox (Mailpit)  | http://localhost:8025 |

To run without Docker, and for the full environment-variable reference, see the [README](../README.md).

## How each acceptance criterion is met

| Criterion                                                                         | Implementation                                                                                                                                                            | Tests                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Home**: the 5 chosen products are featured                                      | `apps/api/config/featured.json` (5 curated ids, checked at startup) feeds `GET /api/products/featured`, which feeds the home page                                        | Service: configured order, missing ids skipped and logged. Route: 200. UI: exactly 5 tiles rendered                            |
| **Category**: clicking a category link shows top rated plus additional products   | Category links in the header open `/category/:slug`, which calls `GET /api/categories/:slug/products` and gets `{ topRated: top 3 by rating, others }`                    | Service: the split, sorting and tie-breaks. Route: 200/400/404. UI: clicking a link renders both sections                       |
| **Search**: entering a term and clicking Search shows only matching products      | The header search form opens `/search?q=`, which calls `GET /api/products?search=` (case-insensitive match on title, description and category name)                       | Service: matching rules. Route: 200, and 400 for a blank term. UI: click flow, keyboard-only flow, empty results, error and retry |
| **Product**: clicking a tile opens the details page                               | Each tile is one link to `/products/:id`, which calls `GET /api/products/:id`                                                                                             | Route: 200/400/404. UI: clicking a tile shows the details and the Enquire link                                                 |
| **Enquiry**: submitting sends an email to the sales inbox and shows "Thank you"   | Enquire opens `/products/:id/enquire`, which posts to `POST /api/enquiries`. `EnquiryService` checks the product exists, then the `Mailer` sends to `SALES_INBOX`. The form then shows "Thank you" | Route (fake mailer): 202 and exactly one email naming the product. Also 400/404/429/502, honeypot, HTML escaping. UI: validation, Thank you, retry after a server error |

Each criterion was also checked by hand against `docker compose up`. The enquiry check read the email back from Mailpit. The step-by-step instructions are in the README.

## Tests

```bash
npm test && npm run typecheck && npm run lint
```

- **165 Vitest tests across 26 files**, all passing: contracts 10, API 116, web 39.
- **API:**
  - Unit tests for `CatalogueService`, `EnquiryService`, the email builder (HTML escaping) and config.
  - The Fake Store mapper and repository: caching, a real timeout, upstream failures, skipping bad records.
  - Route tests using Supertest with an in-memory repository and a fake mailer, including CORS and security headers.
  - Graceful shutdown and the production wiring.
- **Web:** React Testing Library tests of the real app against a stubbed API client, running on the production query client (real retry policy). They cover the search, enquiry, home, category and product flows, plus loading, empty, error and retry states and the error boundary.
- `npm audit --omit=dev` reports **0 vulnerabilities**.

## Known limitations

- **Enquiries aren't stored or queued.** If email delivery fails, the user sees a retryable error; nothing is retried in the background.
- **Rate limiting and the product cache live in memory, per instance.** Running more than one instance needs a shared store such as ElastiCache.
- **Product images load straight from Fake Store's image host.** Product data goes only through our API; images are fetched by the browser from the `imageUrl` we return.
- **`VITE_API_URL` is set at build time,** so changing the API address means rebuilding the web image.
- **No CI pipeline, no infrastructure-as-code, and no automated end-to-end browser test.** These are planned next (see DECISIONS.md).
- **Not in scope:** auth, cart, checkout and pagination.
- **One moderate `npm audit` advisory remains,** in a lint-only dependency (minimatch inside typescript-eslint). No fix has been released, and it only processes our own lint globs.

<!-- TODO(author): add the time spent (or link to AI_USAGE.md#time-spent) and anything you'd like reviewers to focus on. -->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
