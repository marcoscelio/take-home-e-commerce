# NTD E-Commerce — Take-Home

An enterprise-shaped e-commerce app: product CRUD, CSV import, search, and a (simulated) purchase flow, with a UI for all of it. Runs as a single Docker container backed by a local SQLite database.

> **Example CSV downloaded / provided on: 2026-07-07.** The file lives at `data/products.csv` and is used to seed the database on first run.

**Tech:** Next.js 15 (App Router) · TypeScript · Prisma + SQLite · Tailwind CSS · React Hook Form + Zod · Zustand · PapaParse · sonner · jose (auth) · Vitest (tests).

---

## Run it

### Option A — Docker (recommended)

```bash
docker compose up --build
```

Then open **http://localhost:3000**. On first boot the container runs migrations and seeds the catalog from `data/products.csv`. The database is stored in a named volume (`ntd_db`) so it persists across restarts.

The image uses a **multi-stage build**: general dev dependencies (TypeScript, Tailwind, ESLint, Vitest, `@types/*`) are dropped from the final stage — it keeps only production dependencies plus the two tools needed for DB init (Prisma CLI + tsx).

Plain Docker (no compose):

```bash
docker build -t ntd-ecommerce .
docker run -p 3000:3000 -v ntd_db:/app/db ntd-ecommerce
```

### Option B — Local (Node 20+)

```bash
cp .env.example .env
npm install
npm run db:migrate      # creates the SQLite DB + tables
npm run db:seed         # imports data/products.csv
npm run dev             # http://localhost:3000
```

Production-style local run: `npm run build && npm start`.

---

## How to test it

- **Shop (`/`)** — search by name/SKU/description, filter by category, sort, toggle “in stock only”, paginate.
- **Purchase** — add products to the cart (badge in the header), open **Cart**, adjust quantities, **Proceed to checkout**, then **Pay (simulated)**. Try **Simulate declined payment**, and try buying more than the available stock to see the stock guard. On success, stock is decremented and an order is recorded.
- **Admin (`/admin/products`)** — protected; you’ll be sent to **`/admin/login`**. Sign in with **`admin` / `admin123`** (configurable via env). Then create/edit/delete products, filter the table, and import CSV.
- **CSV import** — Admin → **Import CSV** → choose `data/products.csv` (or any CSV with the expected columns). You’ll get a summary: **created / updated / skipped / duplicates merged**, plus a per-row list of why rows were skipped.
- **Automated tests** — `npm test` (19 tests: parser, schemas, and integration tests for import + checkout including transaction rollback).

The provided CSV is intentionally messy; a good import must survive it. From its 96 rows the app produces **88 products**: it merges 3 duplicate SKUs (last wins) and skips 4 rows with clear reasons — a `free` price, a `-5` stock, and two rows missing a name.

---

## Automated tests

```bash
npm test          # runs the Vitest suite against a throwaway SQLite DB
npm run test:watch
```

- **Unit** — `parseProductsCsv` (all the messy-CSV cases) and `productFormSchema` (coercion/validation).
- **Integration** — `importProducts` (created/updated/skipped counts, idempotent re-import) and `checkout` against a real DB: stock decrement + order snapshot, out-of-stock rejection, declined payment, atomic multi-item checkout, and **transaction rollback safety**.
- `next/cache` is mocked; the tests run in a Node environment with a dedicated `data/test.db` migrated in global setup.

## Authentication & access control

- The storefront and checkout are **public**. The **admin panel and all mutating operations are guarded**.
- `src/middleware.ts` gates `/admin/*`; unauthenticated users are redirected to `/admin/login`.
- Defense in depth: the mutating Server Actions (`create/update/delete`, `importCsv`) also re-check the session server-side, because Server Actions are public POST endpoints — hiding the UI is not enough.
- Session is a signed (jose/HS256) httpOnly cookie. Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET` in `.env`.

## HTTP API (external integrations)

Business logic lives in a **service layer** (`src/server/services/*`) that both the UI (Server Actions) and a versioned REST API share — one implementation, no duplication.

| Method | Endpoint | Auth |
|---|---|---|
| `GET` | `/api/v1/products` (query: `q, category, sort, minPrice, maxPrice, inStock, page, perPage`) | public |
| `GET` | `/api/v1/products/:id` | public |
| `POST` | `/api/v1/products` | `x-api-key` |
| `PATCH` | `/api/v1/products/:id` | `x-api-key` |
| `DELETE` | `/api/v1/products/:id` | `x-api-key` |
| `POST` | `/api/v1/checkout` (`{ lines: [{productId, quantity}], outcome }`) | `x-api-key` |
| `POST` | `/api/v1/import` (`multipart/form-data` file **or** raw CSV body) | `x-api-key` |

```bash
curl http://localhost:3000/api/v1/products
curl -X POST http://localhost:3000/api/v1/import -H "x-api-key: $API_KEY" \
  -F file=@data/products.csv
```

Configure `API_KEY` in `.env`.

## CSV import scalability

- The uploaded file is validated and normalized, then written in **batched transactions** (`src/server/services/import.ts`, 500 rows/tx) instead of one giant transaction — bounding lock time and memory, so a large file no longer locks the products table for the whole import.
- For large/external datasets, use the **`POST /api/v1/import`** route (a Route Handler, not a Server Action) — it accepts a real file upload and is not subject to the Server-Action body-size limit.
- Further scaling (noted, not built): stream-parse via PapaParse `chunk`/`step`, and a background job (status table + polling, or a queue) for very large files.

---

## Decisions & approach

**Simplest architecture that’s still production-shaped.** One full-stack Next.js app — no separate backend service. Mutations are **Server Actions**; data fetching is in Server Components. This keeps types shared end-to-end and the deployable surface to a single container.

**Local DB: SQLite via Prisma.** It’s a real SQL database that’s a single file with zero external services — ideal for “local DB + one Docker container.” Prisma gives type-safe queries, migrations, and transactions (used to keep purchases stock-safe under concurrency).

**Money as integer cents.** Prices are stored as `priceCents: Int`, never floats, to avoid rounding bugs. The UI formats to USD; forms accept dollars and convert on write.

**CSV import is validation-first.** Parsing uses PapaParse (the descriptions contain commas inside quotes, so a naive split breaks). Each row is normalized and validated:

- `price`: strips `$`/whitespace; rejects non-numeric (`free`), negative, or blank values.
- `stock`: blank → `0`; rejects negatives (`-5`) and non-integers.
- `weight_kg`: optional; blank/invalid → `null`.
- `category`: blank → `Uncategorized`.
- **Dedupe by SKU** within the file (last row wins) and **upsert by SKU** against the DB, so re-importing is idempotent.
- Invalid rows never fail the whole import — they’re skipped and reported per row.

**Purchase is a real transaction.** Even though payment is faked, checkout re-checks stock inside a DB transaction, decrements it, and persists an `Order` + `OrderItem` snapshot (name/SKU/unit price captured at purchase time), so order history stays intact even if a product is later edited or deleted.

**UX.** Mobile-first responsive grid and admin table, toasts for every action (sonner), inline form validation (Zod + React Hook Form), empty/out-of-stock/loading states, and a cart that persists in `localStorage` (Zustand).

## Alternatives considered

- **Postgres instead of SQLite** — better concurrency and the real production target. Rejected for this exercise because it needs a second container/compose service; the code swaps to it by changing the Prisma `provider` and `DATABASE_URL` (one-line change).
- **Separate API (NestJS/Express) + SPA** — more “enterprise” layering, but more moving parts and duplicated types for a single-deliverable app. Server Actions cover the same ground with less surface.
- **A real payment provider (Stripe test mode)** — out of scope; the requirement explicitly allows faking it, so checkout simulates approve/decline.
- **Category as a locked enum** — the data has 19 categories (plus blanks); a fixed enum would reject valid rows. Categories are free text with dynamic filters derived from the catalog.
- **Storing price as `Decimal`** — works, but integer cents is the safer money representation and avoids driver-specific decimal quirks.

## Trade-offs / what I’d add with more time

- **No auth** — admin and storefront are both open. Production would gate `/admin` behind auth and roles.
- Admin search/pagination is client-side over the full catalog (fine at this size; would move server-side at scale).
- Product images aren’t in the dataset, so cards are text-only.
- Background CSV import for very large files (streaming) instead of a single request.

## Notes

- Per the challenge, this was built with AI assistance and **all code comments were removed**; this README is the only prose.
- `npm run typecheck` and `npm run build` both pass clean.
