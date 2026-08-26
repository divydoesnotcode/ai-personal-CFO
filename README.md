# AI Personal CFO

An AI-powered personal finance platform that helps you understand cash flow, track accounts, set goals, and make better money decisions.

This repository is the early foundation: a FastAPI backend, PostgreSQL financial schema, and a Next.js frontend. Domain APIs, ML, RAG, and the product UI are still being built.

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.x-D71F00)](https://www.sqlalchemy.org/)

## Why this exists

Most personal finance tools show you what already happened. This project is aimed at a CFO-style layer on top of that:

- What is my real cash position across accounts?
- Where is money leaking, and is it a pattern?
- Am I on track for an emergency fund, education, home, or debt payoff?
- What should I do next, given my actual ledger?

The long-term product is a private financial copilot: ingest transactions, classify them, forecast, and explain recommendations.

## Current status

| Area | Status |
| --- | --- |
| FastAPI app, health/readiness, CORS | Ready |
| Async PostgreSQL + SQLAlchemy 2 | Ready |
| Alembic financial schema | Ready |
| Domain API (`/api/v1`) | Not yet |
| Auth | Not yet |
| Next.js UI | Scaffold only |
| ML / RAG / agents | Folders reserved |

## Architecture

```text
┌─────────────┐     HTTP      ┌──────────────────┐     async      ┌────────────┐
│  Next.js    │ ────────────► │  FastAPI         │ ─────────────► │ PostgreSQL │
│  frontend   │  :3000        │  backend :8000   │  SQLAlchemy    │  :5433     │
└─────────────┘               └──────────────────┘                └────────────┘
                                      │
                                      ├── agents/   (planned)
                                      ├── ml/       (planned)
                                      └── rag/      (planned)
```

**Stack**

| Layer | Choice |
| --- | --- |
| API | FastAPI + Uvicorn |
| Config | pydantic-settings |
| Database | PostgreSQL 16, SQLAlchemy 2 (async), psycopg 3 |
| Migrations | Alembic |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Charts / HTTP | Recharts, Axios, Zod |
| Data / ML (later) | pandas, scikit-learn, XGBoost, SHAP |

Money is stored as `Numeric(19, 4)` / `Decimal`, never `float`. Amounts are always positive; direction comes from `transaction_type`. Default currency is INR.

## Data model

```mermaid
erDiagram
    users ||--o{ accounts : owns
    users ||--o{ transactions : records
    users ||--o{ categories : defines
    users ||--o{ financial_goals : sets
    accounts ||--o{ transactions : contains
    categories ||--o{ transactions : classifies
    categories ||--o{ categories : parent

    users {
        uuid id PK
        string email
        bool is_active
    }
    accounts {
        uuid id PK
        uuid user_id FK
        string name
        enum account_type
        numeric balance
    }
    transactions {
        uuid id PK
        uuid user_id FK
        uuid account_id FK
        enum transaction_type
        numeric amount
        string currency
        timestamptz transaction_date
    }
    categories {
        uuid id PK
        uuid user_id FK
        string name
        uuid parent_id FK
    }
    financial_goals {
        uuid id PK
        uuid user_id FK
        enum goal_type
        enum status
        numeric target_amount
        date target_date
    }
```

**Account types:** bank, savings, cash, credit card, investment, loan

**Transaction types:** income, expense, transfer, refund, adjustment, interest, fee, loan payment, dividend

**Goal types:** emergency fund, education, home, vehicle, travel, investment, debt payoff, savings, other

## Repository layout

```text
ai-personal-CFO/
├── alembic/                 # Database migrations
├── backend/
│   └── app/
│       ├── main.py          # FastAPI entry (thin)
│       ├── config.py        # Environment settings
│       ├── database.py      # Async engine + sessions
│       ├── models/          # SQLAlchemy schema
│       ├── api/             # Versioned routers (planned)
│       ├── services/        # Business logic (planned)
│       ├── agents/          # LLM agents (planned)
│       ├── ml/              # Inference helpers (planned)
│       └── rag/             # Retrieval (planned)
├── frontend/                # Next.js App Router
├── data/                    # Raw / processed / synthetic datasets
├── ml/                      # Training, evaluation, model artifacts
├── notebooks/               # Exploration
├── docs/                    # Product, API, architecture, security
├── docker-compose.yml       # Postgres (and future app services)
├── requirements.txt
└── .env.example
```

## Prerequisites

- Python 3.14
- Node.js 20+
- Docker Desktop (for PostgreSQL)
- Git

## Quick start

### 1. Clone and configure

```bash
git clone https://github.com/divydoesnotcode/ai-personal-CFO.git
cd ai-personal-CFO

cp .env.example .env
```

Set `SECRET_KEY` in `.env` to a unique string of at least 32 characters:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`LLM_API_KEY` and `LLM_MODEL` can stay empty for now.

### 2. Start PostgreSQL

Postgres is published on **host port 5433** so it does not collide with a local Postgres on 5432.

```bash
docker compose up -d postgres
```

Confirm it is healthy:

```bash
docker compose ps
```

### 3. Backend

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
alembic upgrade head
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

| Endpoint | Purpose |
| --- | --- |
| [http://localhost:8000](http://localhost:8000) | API info |
| [http://localhost:8000/health](http://localhost:8000/health) | Liveness |
| [http://localhost:8000/ready](http://localhost:8000/ready) | Readiness |
| [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI |
| [http://localhost:8000/redoc](http://localhost:8000/redoc) | ReDoc |

The API refuses to start if PostgreSQL is unreachable.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI is still the Next.js starter; it is wired to call `http://localhost:8000` once the app is built out (`NEXT_PUBLIC_API_URL`).

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Async SQLAlchemy URL, e.g. `postgresql+psycopg://postgres:postgres@localhost:5433/personal_cfo` |
| `SECRET_KEY` | Yes | App secret, minimum 32 characters |
| `APP_NAME` | No | Defaults to `AI Personal CFO` |
| `APP_VERSION` | No | Defaults to `0.1.0` |
| `ENVIRONMENT` | No | `development` / `production` |
| `DEBUG` | No | SQL echo and debug mode when `true` |
| `BACKEND_HOST` | No | Defaults to `0.0.0.0` |
| `BACKEND_PORT` | No | Defaults to `8000` |
| `LLM_API_KEY` | No | Reserved for LLM features |
| `LLM_MODEL` | No | Reserved for LLM features |

CORS currently allows `http://localhost:3000`.

## Database migrations

```bash
# Apply all migrations
alembic upgrade head

# Autogenerate after model changes
alembic revision --autogenerate -m "describe the change"

# Roll back one revision
alembic downgrade -1
```

Alembic reads `DATABASE_URL` from application settings. Do not hardcode credentials in `alembic.ini`.

## Development notes

- Keep `backend/app/main.py` thin. Business logic belongs in services; SQL lives in models/repositories; HTTP lives in routers.
- Financial values must stay `Decimal` end to end.
- Do not log balances, merchant names, or other sensitive ledger fields by default.
- `.env` is gitignored. Commit `.env.example` only.

Useful backend tooling already in `requirements.txt`: pytest, ruff, mypy, coverage.

```bash
# From the repo root, with the venv active
ruff check backend
mypy backend
pytest
```

Frontend:

```bash
cd frontend
npm run lint
```

## Roadmap

1. Restore a complete `User` model and ship `/api/v1` for users, accounts, transactions, categories, and goals.
2. Authentication and per-user isolation.
3. Transaction import + categorization (rules, then ML).
4. Cash-flow, net-worth, and goal-progress services.
5. Dashboard UI (accounts, ledger, charts).
6. Forecasting, RAG over the user's financial history, and a conversational CFO agent.

## Security

This is a personal-finance system. Treat every environment as if it holds real money data:

- Never commit `.env`, dumps, or model artifacts with personal records.
- Use a unique `SECRET_KEY` per environment.
- Prefer parameterized queries (SQLAlchemy) and Decimal math.
- Keep debug SQL logging off outside local development.

## License

No license has been published yet. All rights reserved unless a `LICENSE` file is added.