# Multi-Database Setup with Prisma 7

## Architecture

```
Feature Branch  ──→  .env.development  ──→  Development DB  (local dev work)
        │
        ▼  PR merge
Staging Branch  ──→  GitHub Actions  ──→  Staging DB  (QA/testing)
        │
        ▼  PR merge
Main Branch     ──→  GitHub Actions  ──→  Production DB  (live users)
```

## How Branch → DB Mapping Works

`src/scripts/load-env.ts` detects the current git branch and loads the matching `.env.*` file:

| Branch | Env file loaded | Database |
|---|---|---|
| `main` / `master` | `.env.production` | Production DB |
| `staging` / `develop` | `.env.staging` | Staging DB |
| anything else | `.env.development` | Development DB |

## Two-URL System (Supabase)

Prisma 7 requires two connection strings to work with connection poolers:

| URL | Port | Used for |
|---|---|---|
| `DATABASE_URL` | **6543** (pooled/PgBouncer) | App runtime — passed to `PrismaPg` adapter |
| `DIRECT_URL` | **5432** (direct) | Prisma CLI — set in `prisma.config.ts` |

- `DATABASE_URL` goes through PgBouncer (transaction pooler) — good for serverless/app runtime
- `DIRECT_URL` bypasses pooler — required for Prisma Migrate, `db push`, introspection

## Project Structure

```
multi_db_version/
├── .env.example              # Template (safe to commit)
├── .env.development          # Dev DB credentials (gitignored)
├── .env.staging              # Staging DB credentials (gitignored)
├── .env.production           # Production DB credentials (gitignored)
├── .gitignore
├── package.json
├── prisma.config.ts          # Prisma CLI config — uses DIRECT_URL
├── tsconfig.json
├── prisma/
│   ├── schema.prisma         # Schema models
│   └── migrations/           # Migration files (COMMIT THESE)
├── src/
│   ├── index.ts              # Express app entry
│   ├── lib/
│   │   ├── env.ts            # Branch detection + env loader
│   │   └── prisma.ts         # Prisma client singleton with adapter
│   └── scripts/
│       ├── load-env.ts       # Core: picks .env by branch
│       ├── migrate-dev.ts    # npm run migrate:dev
│       ├── migrate.ts        # npm run migrate:deploy
│       ├── migrate-status.ts # npm run migrate:status
│       ├── generate.ts       # npm run db:generate
│       └── studio.ts         # npm run studio
└── .github/
    └── workflows/
        ├── deploy-prod.yml   # Triggered on push to main
        └── deploy-staging.yml # Triggered on push to staging/develop
```

## Key Files Explained

### `prisma.config.ts`
```ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DIRECT_URL") },  // CLI uses DIRECT_URL
})
```

### `src/lib/prisma.ts`
```ts
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```
Runtime uses `DATABASE_URL` (pooled). CLI uses `DIRECT_URL` from config.

### `prisma/schema.prisma`
```prisma
datasource db { provider = "postgresql" }
// No url or directUrl here — all in prisma.config.ts
```

## NPM Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with auto-reload |
| `npm run build` | Generate client + compile TypeScript |
| `npm run start` | Run compiled production build |
| `npm run migrate:dev -- name` | Create & apply migration (branch-aware) |
| `npm run migrate:deploy` | Apply pending migrations safely |
| `npm run migrate:status` | Check migration status |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run studio` | Open Prisma Studio GUI |

## Daily Dev Workflow

```bash
# 1. Start a feature
git checkout main
git pull
git checkout -b feat/my-feature
npm install

# 2. Edit schema → create migration
npm run migrate:dev -- add_new_table
npm run db:generate

# 3. Commit
git add .
git commit -m "feat: add new table"

# 4. Push → PR → merge to staging → QA tests → merge to main
git push origin feat/my-feature
```

## CI/CD with GitHub Actions

### Secrets to set in GitHub Repo → Settings → Secrets → Actions

| Secret | Value |
|---|---|
| `PRODUCTION_DIRECT_URL` | Production DB direct connection (port 5432) |
| `STAGING_DIRECT_URL` | Staging DB direct connection (port 5432) |

### `deploy-prod.yml` — Triggered on push to `main`
- Checks out code
- Runs `prisma generate`
- Runs `prisma migrate deploy` using `PRODUCTION_DIRECT_URL`
- Builds the app

### `deploy-staging.yml` — Triggered on push to `staging` / `develop`
- Same as production but uses `STAGING_DIRECT_URL`

## Golden Rules

| ✅ Do | ❌ Don't |
|---|---|
| Run `migrate:dev` on feature branches only | Run `migrate dev` directly on `main` |
| Run `db:generate` after schema changes | Edit `src/generated/` manually |
| Commit `prisma/migrations/` folder | Delete or edit migration files |
| Use npm scripts (not raw `npx prisma`) | Use `&&` in PowerShell for chaining |
| Test migrations on staging first | Push schema changes directly to `main` |

## Supabase Connection Strings

Get these from **Supabase Dashboard → Project Settings → Database**:

| Type | Port | Example |
|---|---|---|
| Pooled (PgBouncer) | 6543 | `postgresql://postgres.projectref:pass@pooler.supabase.com:6543/postgres?pgbouncer=true` |
| Direct (Session) | 5432 | `postgresql://postgres.projectref:pass@pooler.supabase.com:5432/postgres` |

## Making Changes Safely

1. **Edit `schema.prisma`** — add/modify models
2. **Run `npm run migrate:dev -- description`** — creates migration file + applies to dev DB
3. **Commit migration files** — they're SQL that will replay on other DBs
4. **Push to staging** — CI applies migration to staging DB
5. **QA tests on staging**
6. **Merge to main** — CI applies migration to production DB

No manual SQL needed. Prisma handles the diff and generates the SQL for you.
