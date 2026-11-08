# Decisions and assumptions

The full spec is in [SPEC.md](SPEC.md), including the endpoints, error model and a table mapping each acceptance criterion to the code and tests that satisfy it. This file covers the judgement calls.

## Assumptions

Where the acceptance criteria left a gap, I made these assumptions.

| Topic                            | Assumption                                                                                                                                                                                                                          | Why                                                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home: "5 products I have chosen" | A **curated list** of 5 product ids in `apps/api/config/featured.json`, checked at startup (exactly 5, unique). It is not computed from ratings. If the source no longer has one of the ids, it is skipped and a warning is logged. | The criterion says _chosen_, so curation is a business decision. Config changes without code changes. A partial home page beats a broken one, and the warning makes the config problem visible. |
| Category: "top rated"            | The **top 3 by average rating**, with ties broken by number of ratings, then by title. "Additional products" are the rest of the category, in the same order.                                                                       | 3 fills one row of tiles. Breaking ties makes the order stable and testable.                                                                                                                    |
| Search: "text matching"          | Case-insensitive substring match on **title, description and category name**, run on the server. Results keep the source order. An empty term is rejected (400), and the UI doesn't send one.                                       | A literal reading of "text matching the term". Running it on the server means the client never needs the whole catalogue, and a real search index can replace it behind the same endpoint.      |
| Enquiry                          | About **one product**. Name, email and message are required; phone is optional. One email goes to a configured `SALES_INBOX`, with `Reply-To` set to the customer. The enquiry is **not persisted**: the email is the record.       | The minimum for sales to act on it. Storage isn't in the criteria (see "Dropped or simplified").                                                                                                |
| "Thank you"                      | Shown in place of the form after the API accepts the enquiry (202). Focus moves to it for screen-reader users.                                                                                                                      | The criterion only requires the message.                                                                                                                                                        |
| Scope                            | **No auth, accounts, cart, checkout or pagination.**                                                                                                                                                                                | None are in the criteria, and the catalogue has about 20 products. Each can be added without reworking the existing boundaries.                                                                 |
| Currency                         | Prices are shown in AUD, exactly as Fake Store returns them.                                                                                                                                                                        | Fake Store has no currency field. `currency` is part of our contract, so a real source can set it.                                                                                              |
| Product ids                      | Opaque strings, even though Fake Store uses numbers.                                                                                                                                                                                | The next data source may use SKUs or UUIDs. This avoids a contract change later.                                                                                                                |
| Product images                   | The browser loads images from Fake Store's image host, using the `imageUrl` our API returns. Only `https` URLs are accepted.                                                                                                        | All product _data_ goes through our API, as constraint 2 requires. Images are static files, not API calls. I've flagged it because a stricter reading is possible.                              |
| Web stack                        | A React + TypeScript single-page app built with Vite, not Next.js.                                                                                                                                                                  | Nothing here needs server-side rendering. A static build is simpler and is hosted directly on S3 + CloudFront.                                                                                  |

## Dropped or simplified, and why

| What                                                     | Simplification                                                                                                                                     | Why                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Enquiry durability                                       | Not stored and not queued. If email fails, the user gets a retryable error message.                                                                | Proves the flow end to end without a database. Storage plus a queue is the first growth step. |
| Abuse protection                                         | A hidden honeypot field and a per-IP rate limit (5 enquiries per 15 minutes). No CAPTCHA.                                                          | No third-party account is needed, and it's enough for a PoC.                                  |
| Customer confirmation email                              | Not sent.                                                                                                                                          | Not in the criteria.                                                                          |
| Caching and rate-limit state                             | Held in memory, per instance.                                                                                                                      | Correct for one container. Running several needs a shared store (documented in SPEC §7).      |
| Web config                                               | `VITE_API_URL` is fixed at build time, so changing it means rebuilding the image.                                                                  | Runtime config injection adds moving parts that a PoC doesn't need.                           |
| Testing                                                  | Unit, API route and UI component tests. No automated end-to-end browser test; the email path was checked by hand in Mailpit (steps in the README). | Covers the critical path within the time-box.                                                 |
| CI and infrastructure-as-code                            | Not included.                                                                                                                                      | Time-box. First on the next-day list.                                                         |
| <!-- TODO(author): anything else you consciously cut --> |                                                                                                                                                    |                                                                                               |

## How the design grows beyond the PoC

The brief says the product data source, look and feel, and email provider will change. Each one sits behind a single seam:

| Will change    | Seam                                                                                                                                                 | What a change looks like                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product data   | The `ProductRepository` interface (`apps/api/src/domain`). Fake Store is one adapter, and it's the only code that knows Fake Store's response shape. | Write a new adapter (database, PIM, commerce platform) and wire it in `apps/api/src/server.ts`. Services, routes, contracts and the web app don't change.   |
| Email provider | The `Mailer` interface. SMTP is the adapter.                                                                                                         | AWS SES over SMTP needs **env changes only** (`SMTP_HOST`, credentials, `SMTP_REQUIRE_TLS=true`). A queue-based or SES-SDK mailer would be another adapter. |
| Look and feel  | Design tokens in `apps/web/src/styles/tokens.css`. Component styles use only those tokens, and there's no UI library.                                | When the creative work lands, it's mostly token edits, then component styling.                                                                              |

Two things keep these seams from eroding:

- **One shared contract.** `packages/contracts` (Zod) defines and validates the same shapes in the API and the web app, so they can't drift apart.
- **Boundaries checked by lint.** `npm run lint` fails if:
  - anything other than the composition root (`server.ts`) imports an adapter
  - `domain/` depends on anything outward
  - the web app calls `fetch` outside its API client
  - Fake Store appears outside its adapter

### AWS path

| Part           | Target                                                                                                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API            | **ECS Fargate** (or App Runner), using the existing image: stateless, non-root, with a health check and graceful shutdown. **Lambda** is an alternative: `createApp()` can be wrapped with a serverless-Express adapter, but the in-memory cache and rate limit would have to move to a shared store first. |
| Web            | **S3 + CloudFront**, serving the static build. The CSP and security headers in `nginx.conf` would move to a CloudFront response-headers policy.                                                                                                                                                             |
| Email          | **SES** through its SMTP endpoint (env change only), with credentials in Secrets Manager.                                                                                                                                                                                                                   |
| Config/secrets | Everything is configured through environment variables and validated at startup. In AWS these come from the ECS task definition plus Secrets Manager or Parameter Store.                                                                                                                                    |

## What I'd do next with another day

<!-- TODO(author): reorder or trim to your own priorities -->

1. **CI:** GitHub Actions running lint, typecheck, tests, `npm audit` and a Docker build on every PR.
2. **End-to-end test:** Playwright against `docker compose up`, checking through Mailpit's API that the enquiry email arrives.
3. **Durable enquiries:** store each enquiry (DynamoDB or Postgres) and send email through SQS with retries, plus a customer confirmation email.
4. **Infrastructure:** CDK for ECS, S3/CloudFront, SES and Secrets Manager. Also a shared cache and rate-limit store (ElastiCache), and web config injected at runtime.
5. **Real data source:** a second `ProductRepository` adapter, with images served from our own CDN.
6. **Observability:** structured JSON logs and metrics, and keep serving cached data during short upstream outages.
