# Food Ordering API

NestJS + TypeScript backend for a food ordering app (Node.js interview task).

Features: register/login with email or phone, OTP login, products with variants, cart and orders.

Stack: NestJS, PostgreSQL (TypeORM), JWT, Jest

## Requirements

- Node.js 22
- Docker (only used to run PostgreSQL)

## Setup

```bash
npm ci
docker compose up -d --wait
cp .env.example .env
```

On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`.

Set your own values for `JWT_ACCESS_SECRET` and `OTP_HASH_SECRET` in `.env` (32+ characters).

```bash
npm run migration:run
npm run seed
```

Seed creates sample products and an admin user: `admin@example.com` / `Admin12345`

## Run

```bash
npm run start:dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs

There is no real email/SMS service, so OTP codes and order emails are printed in the terminal.

## Tests

```bash
npm test
npm run test:e2e
```

E2E tests use a separate database (`food_ordering_test`) and need Docker running.

## Database

```bash
docker compose stop       # stop
docker compose start      # start again
docker compose down -v    # remove everything
```

If port 5432 is already in use, change it to `"5433:5432"` in `docker-compose.yml` and set `DB_PORT=5433` in `.env`.

## Notes

- `POST /orders` requires an `Idempotency-Key` header to avoid duplicate orders.
- Prices are stored in cents (`1599` = 15.99).
- Emails and OTPs are sent as background jobs from the `background_jobs` table, with retries.
- Set `CLUSTER_WORKERS` in `.env` to run multiple processes.
