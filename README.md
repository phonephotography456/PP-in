# PhonePhotography.in

Next.js (App Router, TypeScript, Tailwind, ESLint) + dedicated PostgreSQL 16 in Docker.

## Prerequisites
Node 20+, npm, Docker Desktop.

## Install
```bash
npm install
cp .env.example .env.local   # then set a real POSTGRES_PASSWORD and matching DATABASE_URL
```

## Database
Container `phonephotography-db`, volume `phonephotography_pgdata`, host port 5433 (localhost only).
```bash
docker compose --env-file .env.local up -d     # start
docker compose --env-file .env.local ps        # status / health
docker compose --env-file .env.local stop      # stop (data kept)
docker compose --env-file .env.local restart   # restart
docker compose --env-file .env.local down      # remove container (volume kept)
docker exec phonephotography-db psql -U phonephotography -d phonephotography -c "select 1"
```
Never use `down -v` unless you want to delete all data.

## App
```bash
npm run dev      # http://localhost:3000 ; Ctrl+C to stop, rerun to restart
npm run build && npm start
```

## Layout
`src/{app,components,services,hooks,lib,types,database}`
