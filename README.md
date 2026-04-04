# PlayGroundAI

PlayGroundAI is a Next.js frontend with a FastAPI backend for running multi-persona AI debates and judging them with a separate model.

## Architecture

- Frontend: Next.js App Router
- Backend: FastAPI
- Debate generation: Groq streaming chat completions
- Judging: Gemini 2.5 Flash
- Persistence: Supabase (optional)

## Frontend Environment

Your existing `.env.local` stays in the repo root. The frontend now requires the FastAPI backend URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_MAX_DEBATE_ROUNDS=3
```

Current frontend/provider values:

```bash
GROQ_API_KEY=
GOOGLE_AI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Backend Environment

FastAPI reads from either:

- `backend/.env`
- root `.env.local`

Recommended backend env names are:

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
```

For demo-only usage, the backend can still fall back to:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

but server-only Supabase credentials are strongly preferred.

## Running The Demo

### 1. Frontend

```bash
npm run dev
```

### 2. Backend

Use the requested conda environment:

```bash
conda activate playground
uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

### 3. Tests

```bash
conda run -n playground pytest backend/tests
```

## Render Keep-Alive

The backend already exposes a lightweight public health endpoint:

```bash
GET /health
```

To keep a free-tier Render service warm, this repo now includes an external scheduler using GitHub Actions:

- Workflow file: `.github/workflows/render-keepalive.yml`
- Schedule: every 5 minutes
- Behavior: sends a simple GET request to your deployed Render `/health` URL
- Retries: 3 retries with delay

### Setup

1. Deploy the FastAPI backend on Render.
2. Copy the public health URL:

```bash
https://<your-render-service>.onrender.com/health
```

3. In GitHub, open:
   `Repo Settings -> Secrets and variables -> Actions`
4. Add a repository secret named:

```bash
RENDER_HEALTHCHECK_URL
```

5. Set its value to your Render health URL.

This keeps the ping external to Render and external to the browser, which is the right pattern for free-tier keep-alive.

## Backend Files

- `backend/app/main.py`
- `backend/app/api/routes/debate.py`
- `backend/app/api/routes/judge.py`
- `backend/app/domain/`
- `backend/app/providers/`
- `backend/app/services/`
- `backend/app/repositories/`

## Notes

- The old Next.js API backend was removed.
- The frontend now talks to FastAPI only.
- The hardest compatibility point remains streaming SSE from `/api/debate`.
- Supabase persistence is optional; the app still works without it.
- Public demo protection is now controlled by the anonymous quota env values above.
