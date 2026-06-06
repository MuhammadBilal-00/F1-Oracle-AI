# Deployment guide

The platform deploys as two services:

- **Frontend** → **Vercel** (Next.js 16)
- **Backend** → **Railway** or **Render** (FastAPI)
- **Database** (optional, for production) → **Neon** Postgres; SQLite is the zero-config default.

```
Browser ──▶ Vercel (Next.js) ──HTTPS──▶ Railway/Render (FastAPI) ──▶ SQLite / Neon Postgres
```

---

## 1. Backend → Railway or Render

The backend needs Python 3.11, the dependencies in `requirements.txt`, and a built warehouse/feature store/models.

**Start command** (already provided as a root `Procfile`):

```
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

**Build / release step** — generate the data artifacts (they are git-ignored):

```bash
pip install -r requirements.txt
python scripts/setup_all.py     # ETL -> features -> trains models (one time)
```

### Railway
1. New Project → Deploy from GitHub repo.
2. Root directory: repository root.
3. Build command: `pip install -r requirements.txt && python scripts/setup_all.py`
4. Start command is read from `Procfile`.
5. Set environment variables (below). Railway provides `$PORT` automatically.

### Render
1. New → Web Service → connect the repo.
2. Runtime: Python 3.11. Build command: `pip install -r requirements.txt && python scripts/setup_all.py`. Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.

### Backend environment variables
| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | Warehouse connection (omit to use bundled SQLite) | `postgresql+psycopg://user:pass@host/db` |
| `CORS_ORIGINS` | JSON array of allowed origins (must include your Vercel URL) | `["https://f1-oracle.vercel.app","http://localhost:3000"]` |

> `CORS_ORIGINS` is read as JSON by pydantic-settings, so pass it as a JSON array string. Add your production frontend URL here or CORS will block the browser.

After deploy, confirm `https://<your-backend>/health` returns `{"status":"healthy"}` and `https://<your-backend>/docs` loads.

---

## 2. Frontend → Vercel

1. **Import** the GitHub repo into Vercel.
2. **Root Directory:** `frontend` (important — the Next.js app is in a subfolder).
3. Framework preset: **Next.js** (auto-detected). Build command `next build`, output handled automatically.
4. **Environment variable:**

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<your-backend>/api/v1` |

5. Deploy. The included [`frontend/vercel.json`](../frontend/vercel.json) pins the framework.

### Build verification
```bash
cd frontend
npm install
npm run lint     # clean
npm run build    # clean — 11 routes prerendered
```

---

## 3. Database → Neon (optional, production)

SQLite is fine for a single-instance demo. For a managed, persistent Postgres:

1. Create a Neon project and copy the connection string.
2. Set `DATABASE_URL=postgresql+psycopg://…` on the backend and add `psycopg[binary]` to `requirements.txt`.
3. Run `python scripts/setup_all.py` once against the Neon database to load the warehouse.

The data layer uses SQLAlchemy, so no application code changes are required to switch engines.

---

## Local development

```bash
# Backend
pip install -r requirements.txt
python scripts/setup_all.py
python -m uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend && npm install
cp .env.example .env.local            # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

> **Windows note:** if port 8000 is held by a stale `--reload` worker, free it with
> `Get-NetTCPConnection -LocalPort 8000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`
> or run the API on another port and update `NEXT_PUBLIC_API_URL`.

## Containers

`deployment/Dockerfile.backend` and `deployment/docker-compose.yml` are provided for container-based hosting of the API.
