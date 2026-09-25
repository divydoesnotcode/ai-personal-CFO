<p align="center">
  <code>CFO // SYSTEM</code> &nbsp;&nbsp;·&nbsp;&nbsp; <code>LEDGER / INR</code> &nbsp;&nbsp;·&nbsp;&nbsp; <code>REF. PERSONAL-CFO / 0.1.0</code>
</p>

<h1 align="center">AI Personal CFO</h1>

<p align="center">
  Your private financial co-pilot.<br>
  Know the cash position. See the leak. Decide the next move.
</p>

<p align="center">
  <a href="https://www.python.org/"><img alt="Python 3.14" src="https://img.shields.io/badge/Python-3.14-0b0b0a?logo=python&logoColor=c45c26"></a>
  <a href="https://fastapi.tiangolo.com/"><img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.141-0b0b0a?logo=fastapi&logoColor=efeae1"></a>
  <a href="https://nextjs.org/"><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-0b0b0a?logo=nextdotjs&logoColor=efeae1"></a>
  <a href="https://www.postgresql.org/"><img alt="PostgreSQL 16" src="https://img.shields.io/badge/PostgreSQL-16-0b0b0a?logo=postgresql&logoColor=c45c26"></a>
  <img alt="Currency INR" src="https://img.shields.io/badge/Currency-INR-c45c26?labelColor=0b0b0a">
</p>

Most finance apps show what already happened. This one is the layer on top of a real ledger: cash across accounts, spending against monthly limits, goals on a date, and a short list of what to do next. Amounts are rupees. The books are yours.

The signed-in workspace is live against PostgreSQL. The conversational CFO, forecasts, and imports are not.

---

## 01  /  Where the project stands

Snapshot of what a signed-in user can do today. **Live** means the screen and the API both persist to the database. **Partial** means the page exists and writes something real, but the full product surface is still thin. **Ahead** means the route or folder is reserved and does not compute or invent numbers.

### Live

| Surface | What it does |
| --- | --- |
| Landing | `/` — the public page, with a path into sign-in |
| Auth | Sign up, sign in, refresh, current user, sign out. Argon2 passwords. Access JWT in memory, with an httpOnly cookie fallback. Refresh token rotates in `cfo_refresh_token` |
| Workspace shell | Sidebar, top bar, profile menu, destination search, density (comfortable / compact) |
| Dashboard | `GET /api/dashboard?range=7D\|30D\|3M\|6M\|1Y`. Net worth, cash flow, savings rate, spending, health, budgets, goals, investments, debt, upcoming, recent activity, insights, next moves. Empty until the ledger has accounts or posted transactions |
| Transactions | List of recent movements, plus a modal to record income, expenses, transfers, and pending items |
| Budgets | Monthly category limits as a wide list (table on desktop, cards on small screens) and a modal to set a limit. Upsert is by category |
| Account | Profile (name, email), workspace notification flags, financial preferences (risk, savings target, emergency-fund months), password change, device sessions, revoke one session, sign out everywhere |
| Schema | Users, accounts, transactions, categories (system + user), goals, budgets, preferences, sessions. Alembic applies on backend start |
| Run | Docker Compose runs Postgres, the API, and the Next.js app together |

Money is `Numeric(19, 4)` / `Decimal`, never `float`. Amounts are positive; direction comes from `transaction_type`. Default currency is INR and is not user-writable.

### Partial

| Surface | What works today | What it does not do yet |
| --- | --- | --- |
| Goals | Create a goal. Progress shows on the dashboard | No list page, no edit, no delete |
| Investments | Create an investment account. Dashboard shows balance and slices from those accounts | No holdings, prices, or allocation advice |
| Debt | Create a loan or credit-card account. Dashboard shows outstanding balances | No amortization, payoff order, or payment schedule |
| Ask your CFO | Drawer on every workspace page. It stores the question locally | No model call. It will not invent a figure |
| Search | Finds workspace destinations by name, and can open the drawer | Does not search transactions, merchants, or categories |
| Readiness | `GET /ready` returns ready. Startup refuses to boot if Postgres is down | `/ready` does not re-check Postgres, Redis, or a model on each call |

### Ahead

| Area | Notes |
| --- | --- |
| AI CFO (`/cfo`) | Copy only. Answers will use the ledger once an agent is connected |
| Reports (`/reports`) | Copy only. Period reviews and exports are not built |
| Imports | No bank feed, CSV, or statement upload. Movements are entered by hand |
| Classification | Categories are chosen at entry, or left unset. No rules engine and no model |
| Forecasts | No projected cash flow or goal-date forecast beyond current pace on the dashboard |
| RAG | `backend/app/rag/` is an empty package |
| ML | `backend/app/ml/` and `ml/` are reserved. Training code is not wired to the API |
| Edits | No update or delete routes for transactions, goals, budgets, or accounts. A budget can be replaced by saving the same category again |

`agents/`, `ml/`, and `rag/` stay empty on purpose. The dashboard insights and next moves are computed from the ledger in `dashboard_service`, not from a language model.

---

## 02  /  Product

Four questions the ledger is meant to answer:

1. What is the real cash position across bank, savings, cash, cards, investments, and loans?
2. Where is money leaving, and is this month over the category limit?
3. Are emergency fund, education, home, and debt goals on pace for their dates?
4. What should happen next, from the numbers already posted?

**Account types.** Bank, savings, cash, credit card, investment, loan.

**Transaction types.** Income, expense, transfer, refund, adjustment, interest, fee, loan payment, dividend. Status is `posted` (counts now) or `pending` (upcoming).

**Goal types.** Emergency fund, education, home, vehicle, travel, investment, debt payoff, savings, other.

---

## 03  /  Routes

Public:

| Path | Page |
| --- | --- |
| `/` | Landing |
| `/signup` | Create an account |
| `/signin` | Sign in |

Workspace (session required). A visit without a session goes to `/signin`.

| Path | Page |
| --- | --- |
| `/dashboard` | Command center |
| `/transactions` | Ledger list and add |
| `/budgets` | Monthly limits |
| `/goals` | Create a goal |
| `/investments` | Add an investment account |
| `/debt` | Add a loan or credit card |
| `/cfo` | Agent placeholder |
| `/reports` | Reports placeholder |
| `/profile` | Name and email |
| `/settings` | Density and notification flags |
| `/preferences` | Risk, savings target, emergency-fund months |
| `/security` | Password and device sessions |

| URL | What |
| --- | --- |
| http://localhost:3000 | App |
| http://localhost:8000 | API info |
| http://localhost:8000/health | Liveness |
| http://localhost:8000/docs | Swagger |
| http://localhost:8000/redoc | ReDoc |

---

## 04  /  Architecture

```text
┌─────────────┐     HTTP      ┌──────────────────┐     async      ┌────────────┐
│  Next.js    │ ────────────► │  FastAPI         │ ─────────────► │ PostgreSQL │
│  :3000      │               │  :8000           │                │  :5433     │
└─────────────┘               └──────────────────┘                └────────────┘
                                      │
                                      ├── services/    ledger, dashboard, auth, account
                                      ├── agents/      empty
                                      ├── ml/          empty
                                      └── rag/         empty
```

| Layer | Choice |
| --- | --- |
| API | FastAPI, Uvicorn |
| Config | pydantic-settings |
| Database | PostgreSQL 16, SQLAlchemy 2 (async), psycopg 3 |
| Migrations | Alembic |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Motion / charts | Framer Motion, Recharts |
| Client HTTP | Axios, Zod |
| Later | pandas, scikit-learn, XGBoost, SHAP (in `requirements.txt`, unused by the API) |

```mermaid
erDiagram
    users ||--o{ accounts : owns
    users ||--o{ transactions : records
    users ||--o{ categories : defines
    users ||--o{ financial_goals : sets
    users ||--o{ budgets : limits
    users ||--|| user_preferences : prefers
    users ||--o{ user_sessions : signs_in
    accounts ||--o{ transactions : contains
    categories ||--o{ transactions : classifies
    categories ||--o{ budgets : caps
```

Postgres is published on **host port 5433** so it does not collide with a local server on 5432. Inside Compose the API uses `postgres:5432`.

---

## 05  /  Run it

You need Git, **Python 3.14**, **Node.js 20.9+** (22 LTS is a good default), and **Docker Engine 24+ with Compose v2**. A C compiler is required for the scientific packages in `requirements.txt` (Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu, Visual Studio Build Tools or WSL2 on Windows). Do not install Postgres on the host unless you intend to. `uvloop` does not support native Windows; use WSL2 for the Python process.

### Docker

```bash
git clone https://github.com/divydoesnotcode/ai-personal-CFO.git
cd ai-personal-CFO
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Put that string in `SECRET_KEY` (at least 32 characters). `LLM_API_KEY` and `LLM_MODEL` can stay empty.

```bash
docker compose up --build
```

The backend container runs `alembic upgrade head` before Uvicorn. The frontend image runs `npm ci` into the `frontend_node_modules` volume. If Next reports a missing module after a dependency change:

```bash
docker compose restart frontend
docker compose up --build frontend
```

`docker compose down` stops the stack. `docker compose down -v` also deletes the Postgres volume and the frontend volumes.

### Native

Terminal A — database:

```bash
docker compose up -d postgres
```

Wait until `postgres` is healthy (`docker compose ps`).

Terminal B — API (macOS, Linux, or WSL):

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows PowerShell, outside WSL: `py -3.14 -m venv .venv` then `.\.venv\Scripts\Activate.ps1`. If activation is blocked, `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. If `python3` is not 3.14, create the venv with `python3.14`.

Terminal C — UI:

```bash
cd frontend
npm ci
npm run dev
```

The UI calls `http://localhost:8000` unless `NEXT_PUBLIC_API_URL` is set (`frontend/.env.local`, or the Compose environment). CORS allows `http://localhost:3000`. The API process exits on startup if Postgres is unreachable.

Frontend check:

```bash
cd frontend
npm run lint
```

### Look at the rows

```bash
docker compose exec postgres psql -U postgres -d personal_cfo
```

```sql
SELECT
  (SELECT count(*) FROM users) AS users,
  (SELECT count(*) FROM accounts) AS accounts,
  (SELECT count(*) FROM transactions) AS transactions,
  (SELECT count(*) FROM categories) AS categories,
  (SELECT count(*) FROM financial_goals) AS financial_goals,
  (SELECT count(*) FROM budgets) AS budgets,
  (SELECT count(*) FROM user_preferences) AS user_preferences,
  (SELECT count(*) FROM user_sessions) AS user_sessions;
```

---

## 06  /  Environment

| Variable | Required | Role |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Native: `postgresql+psycopg://postgres:postgres@localhost:5433/personal_cfo`. Compose overrides this to the `postgres` service |
| `SECRET_KEY` | Yes | At least 32 characters. Unique per environment |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Access JWT lifetime. Code default is **15**. `.env.example` sets `10080` (7 days) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh-token lifetime. Default **7**. Not listed in `.env.example` |
| `BACKEND_PORT` | No | Default `8000` |
| `DEBUG` | No | OpenAPI stays mounted in this build either way |
| `LLM_API_KEY`, `LLM_MODEL` | No | Reserved. Nothing reads them yet |
| `NEXT_PUBLIC_API_URL` | No | Frontend API origin. Default `http://localhost:8000` |

---

## 07  /  APIs

JSON in, JSON out. After sign-in, send `Authorization: Bearer <access token>`. The httpOnly cookie `cfo_access_token` is accepted as a fallback. Success bodies are `{ "success": true, "message": "...", "data": ... }`. Auth failures are `{ "success": false, "message": "..." }` or `{ "detail": "Authentication required" }` with `401`.

Field notes for Postman: [docs/api/postman-auth.md](docs/api/postman-auth.md). Interactive list: http://localhost:8000/docs.

### Auth

| Method | Path | Body | `data` |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | `{ name, email, password }` | `{ id, name, email }` (`201`). `409` if the email exists |
| `POST` | `/api/auth/signin` | `{ email, password }` | `{ user, token }` plus access and refresh cookies. `401` on bad credentials |
| `POST` | `/api/auth/refresh` | cookie `cfo_refresh_token` | New `{ user, token }`. Old session is revoked; the refresh cookie rotates. Path of that cookie is `/api/auth` |
| `GET` | `/api/auth/me` | — | `{ id, name, email }` |
| `POST` | `/api/auth/signout` | — | Revokes the session and clears both cookies |

Sign-in JWTs carry `ver` (token version) and `jti` (session id).

### Dashboard

`GET /api/dashboard?range=7D|30D|3M|6M|1Y` (default `6M`).

```text
hasLedger, source ("live"), generatedAt
overview { netWorth, cashFlow, savingsRate, spending } | null
  each metric: { value, delta: { pct, label } }
financialHealth { score, max, label, summary, pillars[] } | null
cashFlow { "7D"|"30D"|"3M"|"6M"|"1Y": [{ date, label, income, expenses, net }] }
spending [{ id, name, amount }]
budget { spent, limit, warning, categories[] } | null
insights [], goals [], upcoming [], recentTransactions []
investments { connected, value, gain, gainPct, slices[] }
debt { hasDebt, outstanding, monthlyPayments, items[] }
recommendations [], notifications []
errors { [section]: { message } }
```

`hasLedger` is false when there are no accounts and no posted transactions. Recent amounts are signed (income positive). Upcoming amounts are positive. A section that cannot be computed returns its own error; the rest of the page still renders. `401` clears the session.

### Ledger

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/accounts` | Active accounts |
| `POST` | `/api/accounts` | `{ name, account_type, description?, balance? }` (`201`) |
| `GET` | `/api/categories` | System categories plus the user’s own |
| `POST` | `/api/categories` | `{ name, description? }` |
| `GET` | `/api/transactions` | `limit` 1–200, default 50 |
| `POST` | `/api/transactions` | Posted rows move the account balance. Omitting `account_id` opens a Cash account if the user has none. `400` if the balance would go below zero, the account or category is missing, or a transfer is incomplete |
| `GET` | `/api/goals` | Non-cancelled goals |
| `POST` | `/api/goals` | `{ name, goal_type?, target_amount, current_amount?, target_date, description?, is_priority? }` |
| `GET` | `/api/budgets` | `{ id, category_id, category_name, monthly_limit, spent }` |
| `PUT` | `/api/budgets` | Upsert by `category_id`: `{ category_id, monthly_limit }` |

There is no separate `budget_id` field. `id` on a budget is the row’s UUID.

### Account

Each settings page calls only its own resource.

| Method | Path | Notes |
| --- | --- | --- |
| `GET`, `PATCH` | `/api/profile` | Name and email. `409` if the email is taken. `400` on an empty patch |
| `GET`, `PATCH` | `/api/settings` | `density`, `notifyBudget`, `notifyUpcoming`, `notifyGoals`. First read creates defaults |
| `GET`, `PATCH` | `/api/preferences` | `riskTolerance`, `monthlySavingsTargetPct` (0–100), `emergencyFundMonths` (1–24). `currency` is always `INR` |
| `GET` | `/api/security` | Password metadata and active sessions |
| `POST` | `/api/security/password` | `{ current_password, new_password }`. Other sessions are revoked. Returns a new access token. `401` if the current password is wrong |
| `POST` | `/api/security/sessions/{id}/revoke` | One device. Clears the cookie if it was this device |
| `POST` | `/api/security/signout-all` | Revokes every session and bumps `token_version` |

---

## 08  /  Migrations

```bash
alembic upgrade head
alembic revision --autogenerate -m "describe the change"
alembic downgrade -1
```

Current revisions: initial financial schema, user auth fields, budgets and system categories, user preferences and sessions, refresh tokens on sessions.

---

## 09  /  Repository

```text
ai-personal-CFO/
├── alembic/                 # Migrations
├── backend/app/
│   ├── main.py              # FastAPI entry
│   ├── api/                 # auth, dashboard, ledger, account
│   ├── services/            # The calculations and writes
│   ├── models/              # SQLAlchemy schema
│   ├── agents/              # Empty
│   ├── ml/                  # Empty
│   └── rag/                 # Empty
├── frontend/
│   ├── app/page.tsx         # Landing
│   ├── app/(auth)/          # /signup, /signin
│   ├── app/(workspace)/     # Dashboard and the pages above
│   └── components/dashboard/
├── docs/api/postman-auth.md
├── prompts/                 # Landing and dashboard design notes
├── data/                    # Raw, processed, synthetic (unused by the app)
├── ml/                      # Training tree (unused by the app)
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## 10  /  Security

Treat every environment as if the ledger were real.

- Do not commit `.env`, dumps, or exports of personal rows.
- Use a distinct `SECRET_KEY` per environment.
- Keep queries in SQLAlchemy and money in `Decimal`.
- Leave SQL echo off outside local development.
- Access tokens are short-lived when you use the code default. The refresh cookie is httpOnly and only sent to `/api/auth`.

---

## License

`LICENSE` is in the repository and is empty. All rights reserved until that file states otherwise.
