# Omphalos

![Omphalos](public/omphalos.png)

A self-hosted DM campaign manager for tabletop RPGs. Manage sessions, characters, locations, and encounters — all in one place.

Built with React 18, ASP.NET Core 10, and PostgreSQL. Deployed via Docker Compose.

---

## Features

- Manage multiple campaigns / sessions
- Track characters, locations, and encounters per session
- Rich text editing via TipTap
- Dark-themed UI with amber accents
- JWT authentication with httpOnly cookie sessions
- Admin user management

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Setup

1. Copy the example env file and fill in the required values:

   ```bash
   copy .env.example .env
   ```

   | Variable | Required | Description |
   |---|---|---|
   | `POSTGRES_PASSWORD` | Yes | Postgres superuser password |
   | `JWT_SECRET` | Yes | Random string, min 32 characters |
   | `ADMIN_USERNAME` | Yes | Username for the first admin account |
   | `ADMIN_PASSWORD` | Yes | Password for the first admin account |
   | `POSTGRES_USER` | No | Defaults to `omphalos` |
   | `API_PORT` | No | Host port, defaults to `8080` |

2. Start the stack:

   ```bash
   start.bat
   # or
   docker compose up -d --build
   ```

3. Open [http://localhost:8080](http://localhost:8080) and log in with the admin credentials you set.

---

## Architecture

```
src/
├── client/               React 18 frontend (Vite + Tailwind)
├── Omphalos.Domain/      Entities, DTOs, interfaces — no external deps
├── Omphalos.Repository/  EF Core DbContext, migrations, repository implementations (Npgsql)
├── Omphalos.Services/    Service implementations, business logic (BCrypt, JWT)
└── Omphalos.Web/         ASP.NET Core minimal API, DI wiring, serves React from wwwroot
```

**Dependency rule:** Domain ← Repository ← Services ← Web

The React app is built inside Docker (Stage 1 of the Dockerfile) and served by ASP.NET Core from `wwwroot/`. The API is available under the `/api` prefix.

---

## Development

To run just the frontend without Docker:

```bash
npm install
npm run dev
```

### EF Core Migrations

Run from the repo root:

```bash
dotnet ef migrations add <MigrationName> --project src/Omphalos.Repository --startup-project src/Omphalos.Repository
```

Migrations are applied automatically on startup.

---

## Docker Notes

- PostgreSQL data is stored in the named volume `postgres_data` — data persists across restarts
- `docker compose down -v` will **permanently delete** all data
- No HTTPS in the container — terminate TLS at your reverse proxy

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TipTap |
| Backend | ASP.NET Core 10 (Minimal API) |
| Database | PostgreSQL 17 + EF Core |
| Auth | JWT via httpOnly cookie |
| Deployment | Docker Compose |
