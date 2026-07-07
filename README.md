# NTD E-Commerce — Take-Home

An enterprise-shaped e-commerce app: product CRUD, CSV import, search, and a (simulated) purchase flow, with a UI for all of it. Runs as a single Docker container backed by a local SQLite database.

> **Example CSV downloaded / provided on: 2026-07-07.** The file lives at `data/products.csv` and is used to seed the database on first run.

**Live demo tech:** Next.js 15 (App Router) · TypeScript · Prisma + SQLite · Tailwind CSS · React Hook Form + Zod · Zustand · PapaParse · sonner.

---

## Run it

### Option A — Docker (recommended)

```bash
docker compose up --build
```

Then open **http://localhost:3000**. On first boot the container runs migrations and seeds the catalog from `data/products.csv`. The database is stored in a named volume (`ntd_db`) so it persists across restarts.

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
- **Admin (`/admin/products`)** — create/edit/delete products (validated forms), filter the table.
- **CSV import** — Admin → **Import CSV** → choose `data/products.csv` (or any CSV with the expected columns). You’ll get a summary: **created / updated / skipped / duplicates merged**, plus a per-row list of why rows were skipped.

The provided CSV is intentionally messy; a good import must survive it. From its 96 rows the app produces **88 products**: it merges 3 duplicate SKUs (last wins) and skips 4 rows with clear reasons — a `free` price, a `-5` stock, and two rows missing a name.

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
