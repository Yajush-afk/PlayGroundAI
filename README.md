# PlayGroundAI

PlayGroundAI is a Next.js frontend with a FastAPI backend for running multi-persona AI debates and judging them with a separate model.

## Architecture

- Frontend: Next.js App Router
- Backend: FastAPI
- Debate generation: Groq streaming chat completions
- Judging: Gemini 2.5 Flash
- Persistence: Supabase (optional)

## Frontend Environment

Your existing `.env.local` can stay in the repo root. For the FastAPI cutover, add:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Current frontend keys already used by the backend config fallback:

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

Recommended secure backend env names are:

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
```

For demo-only usage, the backend will fall back to:

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

## Backend Files

- `backend/app/main.py`
- `backend/app/api/routes/debate.py`
- `backend/app/api/routes/judge.py`
- `backend/app/domain/`
- `backend/app/providers/`
- `backend/app/services/`
- `backend/app/repositories/`

## Notes

- The frontend still preserves the existing debate/judge API contract.
- The hardest compatibility point is streaming SSE from `/api/debate`.
- Supabase persistence is optional; the app works without it.
