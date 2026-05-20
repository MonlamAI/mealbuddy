# MealBuddy

Full stack: **Next.js** (frontend) + **Laravel** (API) + **PostgreSQL** (database).

## Architecture

```
┌─────────────────┐     HTTP (API)      ┌─────────────────┐
│  Next.js :3000  │ ──────────────────► │ Laravel :8000   │
│  frontend/      │   Sanctum + CORS    │ backend/        │
└─────────────────┘                     └────────┬────────┘
                                                 │ SQL
                                                 ▼
                                        ┌─────────────────┐
                                        │ PostgreSQL :5432 │
                                        │ (Docker)         │
                                        └─────────────────┘
```

## Structure

```
mealbuddy/
├── backend/            # Laravel 13 — REST API, Sanctum, Filament
├── frontend/           # Next.js 16 — React UI
├── docker-compose.yml  # PostgreSQL for local dev
├── package.json        # Root scripts
└── pnpm-workspace.yaml
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL)
- PHP 8.3+ with `pdo_pgsql`, Composer
- Node 20+, pnpm

Install the PHP PostgreSQL extension if needed:

```bash
# macOS (Homebrew PHP)
pecl install pdo_pgsql
# or ensure php is built with pgsql
```

## Setup

**1. Start PostgreSQL**

```bash
pnpm db:up
```

**2. Install dependencies and migrate**

```bash
pnpm setup
cp frontend/.env.example frontend/.env.local
```

`pnpm setup` starts Postgres, installs Node/PHP deps, copies `backend/.env`, generates an app key, and runs migrations.

**3. Run the stack**

```bash
pnpm dev
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| API        | http://localhost:8000      |
| PostgreSQL | `localhost:5432`           |

## Environment

### Backend (`backend/.env`)

Defaults in `.env.example` match Docker Compose:

| Variable       | Default     |
|----------------|-------------|
| `DB_CONNECTION`| `pgsql`     |
| `DB_HOST`      | `127.0.0.1` |
| `DB_PORT`      | `5432`      |
| `DB_DATABASE`  | `mealbuddy` |
| `DB_USERNAME`  | `mealbuddy` |
| `DB_PASSWORD`  | `secret`    |

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Useful commands

```bash
pnpm db:up        # Start PostgreSQL
pnpm db:down      # Stop PostgreSQL
pnpm db:reset     # Wipe volume and recreate DB
pnpm dev          # Laravel + Next.js
pnpm dev:backend  # Laravel only
pnpm dev:frontend # Next.js only
```

### Laravel (from `backend/`)

```bash
php artisan migrate
php artisan migrate:fresh --seed
php artisan tinker
```

## Tests

PHPUnit uses in-memory SQLite (fast, no Docker required):

```bash
cd backend && composer test
```

## Notes

- CORS and Sanctum allow `http://localhost:3000` (`backend/config/cors.php`, `backend/config/sanctum.php`).
- Inertia pages under `backend/resources/js` are for Filament / legacy routes; the main app UI is in `frontend/`.
- Change Postgres credentials in both root `.env` (Docker) and `backend/.env` (Laravel) if you customize them.
