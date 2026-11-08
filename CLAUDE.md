# CLAUDE.md: agent instructions

## Purpose

This is a product catalogue PoC: browse, search, product detail and enquiry by email. It must grow beyond a PoC. The data source, email provider and look and feel are all expected to change. **SPEC.md is the source of truth**; read it before starting any work.

## Hard constraints (never violate)

Rules marked **[lint]** are enforced by `npm run lint`. Don't disable those rules; fix the design instead.

1. **The Fake Store API exists only in `apps/api/src/adapters/fakestore/`.** Its types, URLs and DTOs must not appear anywhere else. Everything outside the adapter uses our `Product` model from `packages/contracts`. **[lint]**: `fakestoreapi` strings are banned outside the adapter.
2. **The web app never calls external services.** `apps/web` talks only to our API, and only through `apps/web/src/api/client.ts`. **[lint]**: `fetch` is banned elsewhere in `apps/web/src`.
3. **`apps/web` is a static React + Vite SPA.** It has no server code, no proxying of third-party hosts and no secrets; anything prefixed `VITE_` ships to the browser. The Express API is the only backend.
4. **Business logic lives in services** (`CatalogueService`, `EnquiryService`). Routes parse, delegate and respond. React components render, and hooks fetch.
5. **Depend on ports, not adapters.** Services take `ProductRepository`, `Mailer` and `Logger` interfaces from `domain/`. Adapters are wired up only in the composition root, `apps/api/src/server.ts`. **[lint]**:
   - only `server.ts` may import `adapters/`
   - `domain/` imports nothing outward
   - adapters must not import services, routes or HTTP code
6. **Shared shapes come from `packages/contracts`** (Zod schemas + `z.infer` types). Never duplicate a type across apps.
7. **Config is read only through the validated `config` module.** No `process.env` anywhere else.
8. **Errors use `{ error: { code, message } }`**, mapped in one error middleware. Never leak stack traces, upstream URLs or internal messages to clients.

## Conventions

- TypeScript `strict`. **No `any`**: use `unknown` and narrow it. No `@ts-ignore`, and no non-null `!` unless you justify it in a comment.
- **Named exports only**, except where tooling requires a default export (Vite, tsup, Vitest and ESLint configs). Don't export things only used in their own file.
- Small files: one responsibility each, about 150 lines max.
- **Zod at every boundary**: HTTP input, upstream responses, env and API responses in the web client.
- Throw typed domain errors (`NotFoundError`, `UpstreamError`, `ValidationError`). Never swallow errors; if you deliberately skip something (e.g. a bad upstream record), log it.
- **Styling:** component CSS modules use only tokens from `src/styles/tokens.css`, with no raw colours, sizes or fonts. Generic utilities in `global.css` (`.visually-hidden`, `.offscreen`) are the only exception.
- Tests sit next to their code as `*.test.ts(x)`. Test behaviour, not implementation details. Web tests stub the `ApiClient`, not `fetch`; only `client.test.ts` mocks `fetch`.

## Workflow

- **Work one phase at a time.** Stop and summarise at the end of each phase, including anything the AI got wrong and how it was caught.
- Work on a feature branch, never on `main`. The submission is an open PR into `main`.
- **Before saying a phase is done**, run `npm test`, `npm run typecheck` and `npm run lint`, and report the actual output. If anything fails, say so.
- **Never add a dependency without stating why**: what it does, and why a smaller option or the standard library won't do. Check the **current** version (`npm view <pkg> version`) and `npm audit` before choosing one; don't pick versions from memory.
- **Never commit secrets.** When you add config, update `.env.example`, the `config` schema and the README env table in the same change.
- `AI_LOG.md` is the human's own log. Don't edit or reformat it.
- If a requirement is unclear, make a reasonable assumption and record it in SPEC.md §12 and DECISIONS.md. Don't block on it.

## Phases (as run) and definition of done

| Phase                  | Scope                                                                                            | Done when                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1 Scaffold + contracts | Workspaces, strict tsconfig, ESLint/Prettier, Vitest, Zod contracts, `/health`, placeholder page | `npm run dev` works; tests and typecheck pass                                          |
| 2 Product data         | Ports, Fake Store adapter (mapper, timeout, TTL cache), `CatalogueService`, routes, error model  | Mapper, service and Supertest route tests cover 200/400/404/502                        |
| 3 Enquiries            | `Mailer` port, `SmtpMailer`, `EnquiryService`, honeypot, rate limit, HTML escaping               | Route tests (FakeMailer) cover 202/400/404/429/502; an email shows up in an SMTP inbox |
| 4 Web                  | CORS + helmet; router, header, pages, enquiry form, client, hooks, tokens                        | Every page has loading, empty and error states; RTL tests pass                         |
| 5 Web tests            | RTL tests for search, enquiry and home against a stubbed API client                              | All acceptance-criteria flows are covered in the UI                                    |
| 6 Ship                 | Dockerfiles, Compose, README                                                                     | `docker compose up --build` works on a clean machine with no setup                     |
| 7 Review fixes         | Strict review findings: dependency upgrades, shutdown, resilience, security, enforcement         | `npm audit` has no production findings; all checks pass                                |
| 8 Submission           | DECISIONS.md, AI_USAGE.md, time spent, commits, PR                                               | Docs cover everything the brief asks for; the PR is open                               |

**Every phase also requires:** tests, typecheck and lint green; no `any`; the hard constraints respected; `.env.example` and docs updated; and a focused commit.
