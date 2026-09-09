# SIREN backend

NestJS 11 + TypeORM + PostgreSQL commerce API. The API is served under `/api` and Swagger is available at `/api/docs`.

## Local setup

1. Copy `.env.example` to `.env` in this folder and replace every placeholder.
2. Create an empty PostgreSQL database named `siren`.
3. Run `database/001_initial_schema.sql` against that database. With Docker installed, `docker compose up -d postgres` runs it automatically on first startup. Without Docker, run the SQL file in pgAdmin, DBeaver, Supabase SQL Editor, or `psql`.
4. Run `npm install`, then `npm run start:dev`.
5. Open `http://localhost:4000/api/docs` for API documentation and `http://localhost:3000/admin` for the admin sign-in.

The first user is created only if the `users` table is empty. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` before the first backend startup. Remove `ADMIN_PASSWORD` from the environment after that first user has been created.

## Environment

```env
DATABASE_URL=postgresql://siren_user:strong_password@localhost:5432/siren
JWT_SECRET=a-long-random-secret-of-at-least-32-characters
FRONTEND_URL=http://localhost:3000
PORT=4000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_initial_password
```

The frontend only receives `NEXT_PUBLIC_API_URL`, for example `http://localhost:4000/api`. Database credentials and `JWT_SECRET` belong only in `backend/.env` and must never be prefixed with `NEXT_PUBLIC_`.

## Implemented API groups

- `POST /api/auth/login`, `GET /api/auth/me`
- Public catalog: products, categories, collections
- Public CMS: banners, posts, lookbook, published pages
- Checkout order creation with transactional inventory reduction
- Admin dashboard, users/roles, audit-log reading
- Admin catalog CRUD: products, variants, categories, collections
- Admin commerce: orders and customers
- Admin CMS CRUD: banners, pages/sections, blog posts, lookbook and settings

Every `/api/admin/*` route requires a Bearer JWT. Role enforcement is applied on the server, not in the browser.
