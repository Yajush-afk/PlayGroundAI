# PlayGroundAI

PlayGroundAI is split into two deployable parts:

- `frontend/` behavior lives in the repo root as a Next.js app
- `backend/` contains the FastAPI API used by the frontend

## Repo Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── domain/
│   │   ├── middleware/
│   │   ├── providers/
│   │   ├── repositories/
│   │   └── services/
│   ├── tests/
│   ├── .env.example
│   ├── environment.yml
│   └── requirements.txt
├── public/
├── src/
├── .github/workflows/render-keepalive.yml
├── next.config.ts
├── package.json
└── render.yaml
```

## What Was Removed

- The old Next.js API backend under `src/app/api/*`
- The old TypeScript Supabase helper `src/lib/supabase.ts`

There is no active TypeScript backend left. The only backend now is FastAPI under `backend/`.

## Local Environment

Frontend env in root `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_MAX_DEBATE_ROUNDS=3
```

Backend env can live in either:

- `backend/.env`
- root `.env.local`

Backend env values:

```bash
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
REQUEST_TIMEOUT_SECONDS=30
STREAM_TIMEOUT_SECONDS=90
JUDGE_TIMEOUT_SECONDS=45
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=20
ANONYMOUS_MAX_ROUNDS=3
ANONYMOUS_DEBATE_WINDOW_SECONDS=1800
ANONYMOUS_DEBATES_PER_WINDOW=2
ANONYMOUS_DEBATES_PER_DAY=5
ANONYMOUS_JUDGES_PER_DAY=5
ANONYMOUS_MAX_ACTIVE_DEBATES=1
ACTIVE_DEBATE_TTL_SECONDS=3600
ADMIN_LEAGUE_KEY=
OFFICIAL_LEAGUE_ENABLED=true
OFFICIAL_DAILY_MATCH_CAP=20
OFFICIAL_DAILY_REQUEST_CAP=120
OFFICIAL_COOLDOWN_MINUTES=30
OFFICIAL_AUTO_RUN_ENABLED=false
OFFICIAL_AUTO_RUN_INTERVAL_SECONDS=900
OFFICIAL_AUTO_RUN_INITIAL_DELAY_SECONDS=15
```

Supabase is optional for demo deployment.

League mode requires Supabase. Apply `backend/supabase_schema.sql` before generating official matches.

## Local Run

Frontend:

```bash
pnpm dev
```

Backend:

```bash
conda activate playground
uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

Backend tests:

```bash
conda run -n playground pytest backend/tests
```

## Official League Admin Workflow

Official matches are generated through a protected admin flow. Public visitors only replay stored matches.

Docs:

```bash
docs/league-admin.md
```

Hidden local admin page:

```bash
http://localhost:3000/admin/league
```

Dry-run command:

```bash
curl -X POST "http://127.0.0.1:8000/api/admin/league/run-match" \
  -H "Content-Type: application/json" \
  -H "X-Admin-League-Key: $ADMIN_LEAGUE_KEY" \
  -d '{"gameType":"auto","dryRun":true}'
```

Real match command:

```bash
curl -X POST "http://127.0.0.1:8000/api/admin/league/run-match" \
  -H "Content-Type: application/json" \
  -H "X-Admin-League-Key: $ADMIN_LEAGUE_KEY" \
  -d '{"gameType":"auto","dryRun":false}'
```

Queue-only command for the homepage Up Next slot:

```bash
curl -X POST "http://127.0.0.1:8000/api/admin/league/run-match" \
  -H "Content-Type: application/json" \
  -H "X-Admin-League-Key: $ADMIN_LEAGUE_KEY" \
  -d '{"gameType":"auto","dryRun":false,"queueOnly":true}'
```

To run the official league live from the backend, set:

```bash
OFFICIAL_AUTO_RUN_ENABLED=true
OFFICIAL_AUTO_RUN_INTERVAL_SECONDS=900
```

With the default interval, the backend attempts one official match every 15 minutes. Quota caps, provider cooldowns, and DB locks still apply.

## Deployment Roots

### Vercel

- Root Directory: repo root `/`
- Framework: Next.js

### Render

- Root Directory: `backend`
- Environment: Python

## Vercel Deployment Guide

1. Import the repo into Vercel.
2. Set the project root to `/`.
3. Add env vars:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com
NEXT_PUBLIC_MAX_DEBATE_ROUNDS=3
```

4. Deploy.

## Render Deployment Guide

You can deploy manually in the dashboard or use `render.yaml`.

Manual settings:

- Root Directory: `backend`
- Build Command:

```bash
pip install -r requirements.txt
```

- Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required env vars:

```bash
GROQ_API_KEY=...
GOOGLE_AI_API_KEY=...
ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app
REQUEST_TIMEOUT_SECONDS=30
STREAM_TIMEOUT_SECONDS=90
JUDGE_TIMEOUT_SECONDS=45
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=20
ANONYMOUS_MAX_ROUNDS=3
ANONYMOUS_DEBATE_WINDOW_SECONDS=1800
ANONYMOUS_DEBATES_PER_WINDOW=2
ANONYMOUS_DEBATES_PER_DAY=5
ANONYMOUS_JUDGES_PER_DAY=5
ANONYMOUS_MAX_ACTIVE_DEBATES=1
ACTIVE_DEBATE_TTL_SECONDS=3600
ADMIN_LEAGUE_KEY=...
OFFICIAL_LEAGUE_ENABLED=true
OFFICIAL_DAILY_MATCH_CAP=20
OFFICIAL_DAILY_REQUEST_CAP=120
OFFICIAL_COOLDOWN_MINUTES=30
OFFICIAL_AUTO_RUN_ENABLED=false
OFFICIAL_AUTO_RUN_INTERVAL_SECONDS=900
OFFICIAL_AUTO_RUN_INITIAL_DELAY_SECONDS=15
```

Optional env vars:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Health Endpoint / Render Keep-Alive

The backend already exposes:

```bash
GET /health
```

Repo includes an external GitHub Actions scheduler:

- `.github/workflows/render-keepalive.yml`

Setup:

1. Deploy backend on Render.
2. Copy:

```bash
https://<your-render-service>.onrender.com/health
```

3. Add GitHub Actions secret:

```bash
RENDER_HEALTHCHECK_URL
```

4. Set it to the health URL above.

This pings every 5 minutes with retries and keeps the free Render service warmer.

## Demo Status

Deployable now for demo use with:

- Groq key
- Gemini key
- Vercel frontend
- Render backend

Supabase can be added later.
