# AI Personal CFO

An AI-powered personal finance platform that helps you understand cash flow, track accounts, set goals, and make better money decisions.

The signed-in dashboard is live against PostgreSQL: overview, health, cash flow, spending, budgets, goals, investments, debt, and recent activity are computed from the user’s ledger. Auth, ledger writes, profile, workspace settings, financial preferences, and session-aware security are wired. The conversational CFO agent and ML/RAG are not.

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)

## Current status

| Area | State |
| --- | --- |
| Landing page | Live at `/` |
| Sign up / sign in | Live, JWT + httpOnly cookie, Argon2 hashes |
| Workspace shell | Sidebar, top nav, profile menu, Ask your CFO drawer |
| Dashboard UI | Overview, health, cash flow, spending, budgets, goals, debt, investments, transactions, insights, next moves |
| Dashboard data | Live `GET /api/dashboard` from the user’s accounts, transactions, goals, and budgets |
| Ledger writes | Add transactions, goals, budgets, and accounts from the workspace |
| Subpages | Transactions, budgets, goals, investments, debt, profile, settings, preferences, and security are live. AI CFO and reports remain copy-only |
| Account | Profile name/email, workspace density and notification flags, financial preferences, password change, device sessions |
| Financial schema | Users, accounts, transactions, categories, financial goals, budgets, preferences, sessions (Alembic) |
| Docker | Postgres, API, and Next.js UI run together |
| AI agent / RAG / ML | Scaffolded directories only |

Signed-in pages require a session. Unauthenticated visits to the workspace redirect to `/signin`.

## What you need to install

| Tool | Version | Why |
| --- | --- | --- |
| [Git](https://git-scm.com/) | 2.40+ | Clone the repo |
| [Python](https://www.python.org/downloads/) | **3.14** | Backend |
| [Node.js](https://nodejs.org/) | **20.9+** (22 LTS recommended) | Frontend. Includes `npm` |
| [Docker](https://docs.docker.com/get-started/get-docker/) | Engine 24+ with **Compose v2** | Postgres, backend, and frontend containers |

Also install a compiler toolchain: Xcode Command Line Tools (macOS), `build-essential` (Linux), or Visual Studio C++ Build Tools / **WSL2** (Windows).

**Recommended:** Git + Docker only. `docker compose up --build` runs Postgres, the API, and the Next.js UI on macOS, Linux, and Windows. Python and Node are optional and only needed for a native (non-Docker) workflow.

Do **not** install Postgres on the host unless you intend to. The supported database is the `postgres` service in `docker-compose.yml`, on **host port 5433**.

Windows: `uvloop` in `requirements.txt` does not support native Windows. Use **WSL2 (Ubuntu)** for the backend.

### macOS

```bash
xcode-select --install

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew update
brew install git python@3.14 node
```

Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) and open it once so the engine is running.

### Linux (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential python3-pip python3-venv software-properties-common

sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.14 python3.14-venv python3.14-dev

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker
```

Log out and back in so the `docker` group applies.

### Windows

Recommended: in **PowerShell as Administrator**:

```powershell
wsl --install
```

Reboot, open Ubuntu, then follow the Linux steps inside WSL. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) with the WSL2 engine enabled.

Native Windows (may fail on `uvloop`):

```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.14 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Docker.DockerDesktop -e
```

If PowerShell blocks venv activation later:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Verify

```bash
git --version
python3 --version          # Windows: py -3.14 --version
node --version
npm --version
docker --version
docker compose version
```

## Start the project

Docker Desktop (or Docker Engine) must already be running.

### 0. First-time setup

```bash
git clone https://github.com/divydoesnotcode/ai-personal-CFO.git
cd ai-personal-CFO

cp .env.example .env
```

Windows PowerShell: `Copy-Item .env.example .env`

Set `SECRET_KEY` in `.env` to at least 32 characters:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Windows: `py -3.14 -c "import secrets; print(secrets.token_urlsafe(48))"`

`LLM_API_KEY` and `LLM_MODEL` can stay empty.

### Run everything with Docker (macOS, Linux, Windows)

This starts Postgres, the FastAPI backend, and the Next.js frontend. You do **not** need Python or Node installed on the host.

Stop any local process already using ports **3000**, **8000**, or **5433**.

```bash
docker compose up --build
```

Detached:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f frontend
```

| URL | Purpose |
| --- | --- |
| http://localhost:3000 | Landing page |
| http://localhost:3000/signup | Create account |
| http://localhost:3000/signin | Sign in |
| http://localhost:3000/dashboard | Workspace home (auth required) |
| http://localhost:8000 | API info |
| http://localhost:8000/health | Liveness |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/redoc | ReDoc |

The frontend container listens on **3000** and calls the API at `http://localhost:8000` from the browser. Backend migrations run automatically on container start (`alembic upgrade head`).

The frontend image runs `npm ci` on start so the named `frontend_node_modules` volume matches `package-lock.json`. If Next reports `Module not found` after a new dependency, restart the frontend container (rebuild if you changed the Dockerfile):

```bash
docker compose restart frontend
docker compose up --build frontend
```

Useful Compose commands:

```bash
docker compose ps
docker compose logs -f frontend backend postgres
docker compose restart frontend
docker compose down
```

`docker compose down` stops containers. Add `-v` only if you also want to delete the Postgres volume (that wipes stored users). Named volumes `frontend_node_modules` and `frontend_next` are also removed with `-v`.

### Native run (optional)

Use this if you want hot reload without rebuilding images. Still start Postgres with Docker.

Python venv (once):

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Frontend packages (once):

```bash
cd frontend
npm install
```

Postgres:

```bash
docker compose up -d postgres
docker compose ps
```

Wait until `postgres` is `healthy`. Host port is **5433**.

Backend (port 8000), from the repo root:

```bash
source .venv/bin/activate
alembic upgrade head
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows activate: `.\.venv\Scripts\Activate.ps1`
If `python3` is not 3.14: `python3.14 -m venv .venv`

Frontend (port 3000), in a second terminal:

```bash
cd frontend
npm run dev
```

Do not mix a native Next.js process and the frontend container on port 3000 at the same time.

The frontend calls `http://localhost:8000` (`NEXT_PUBLIC_API_URL`). Copy `frontend/.env.example` to `frontend/.env.local` if you need to override that.

## App routes

Public:

| Path | Page |
| --- | --- |
| `/` | Marketing landing page |
| `/signup` | Create account |
| `/signin` | Sign in |

Signed-in workspace (sidebar + top nav):

| Path | Page |
| --- | --- |
| `/dashboard` | Command center (live ledger; empty until accounts or posted transactions exist) |
| `/transactions` | Record income, expenses, and upcoming items |
| `/budgets` | Set monthly category limits |
| `/goals` | Create financial goals |
| `/investments` | Add an investment account |
| `/debt` | Add a loan or credit-card account |
| `/cfo` | AI CFO (placeholder until the agent is connected) |
| `/reports` | Reports (placeholder) |
| `/settings` | Workspace density and notification flags |
| `/profile` | Name and email |
| `/preferences` | Risk, savings target, emergency-fund months |
| `/security` | Password and device sessions |

Ask your CFO is a drawer on every workspace page. It records questions locally and does not call an LLM yet.

## Dashboard data

The dashboard client requests `GET /api/dashboard?range=…` (`7D`, `30D`, `3M`, `6M`, `1Y`) with the session JWT. There is no preview fixture: numbers come only from the database.

| Condition | What you see |
| --- | --- |
| No accounts and no posted transactions | Empty ledger (“Your financial picture is waiting”) |
| Accounts and/or posted transactions | Full dashboard (`source: live`) |
| A section cannot be computed | That panel shows its error + Retry; other panels still render |
| `401` | Session is cleared; redirect to sign in |
| Network / 5xx | Dashboard error panel + Retry |

Add data from `/transactions`, `/goals`, `/budgets`, `/investments`, and `/debt`. Posted movements update cash flow and spending; pending movements appear under Upcoming.

## View data in the database

Signup rows land in the `users` table. Workspace forms write accounts, transactions, goals, budgets, profile fields, preferences, and sessions.

### Connection (CLI and GUI)

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | **5433** |
| Database | `personal_cfo` |
| User | `postgres` |
| Password | `postgres` |
| SSL | Off |

### Command line (`psql`)

```bash
docker exec -it personal-cfo-postgres psql -U postgres -d personal_cfo
```

Inside `psql`:

```sql
\dt

\d users

SELECT id, name, email, is_active, created_at
FROM users
ORDER BY created_at DESC;

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

Leave with `\q`.

One-shot from the terminal:

```bash
docker exec -it personal-cfo-postgres \
  psql -U postgres -d personal_cfo \
  -c "SELECT id, name, email, is_active, created_at FROM users;"
```

Do not treat `password_hash` as a readable password. It is Argon2.

### GUI

Install one of:

```bash
brew install --cask tableplus
# or
brew install --cask pgadmin4
```

**TablePlus:** new PostgreSQL connection → fill in the table above → Connect → open `users`.

**pgAdmin:** Register Server → host `localhost`, port `5433`, database `personal_cfo`, user `postgres`, password `postgres` → Databases → personal_cfo → Schemas → public → Tables → `users` → View/Edit Data → All Rows.

**VS Code / Cursor:** install a PostgreSQL extension (SQLTools + PostgreSQL driver, or similar), add the same connection, then run the `SELECT` above.

After signing up at http://localhost:3000/signup, refresh `users`.

## APIs

Unless noted, send `Content-Type: application/json`. After sign-in, send `Authorization: Bearer <token>` (the httpOnly cookie `cfo_access_token` also works). Successful bodies use `{ "success": true, "message": "...", "data": ... }`. Auth failures use `{ "success": false, "message": "..." }` or `{ "detail": "Authentication required" }` (`401`).

OpenAPI: http://localhost:8000/docs. Auth Postman notes: [docs/api/postman-auth.md](docs/api/postman-auth.md).

### Auth

| Method | Endpoint | Purpose | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Register | `{ "name", "email", "password" }` | `{ "id", "name", "email" }` (`201`) |
| `POST` | `/api/auth/signin` | Sign in | `{ "email", "password" }` | `{ "user": { "id", "name", "email" }, "token" }` + cookie. Creates a device session (`jti` in the JWT). |
| `GET` | `/api/auth/me` | Current user | — | `{ "id", "name", "email" }` |
| `POST` | `/api/auth/signout` | Revoke this session and clear cookie | — | `{ "signedOut": true }` |

### Dashboard (added)

| Method | Endpoint | Purpose | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/dashboard` | Assemble the signed-in command center | Query `range`: `7D` \| `30D` \| `3M` \| `6M` (default) \| `1Y` | See payload below |

Dashboard `data` (camelCase):

```text
hasLedger, source ("live"), generatedAt,
overview { netWorth, cashFlow, savingsRate, spending } | null
  each metric: { value, delta: { pct, label } },
financialHealth { score, max, label, summary, pillars[] } | null,
cashFlow { "7D"|"30D"|"3M"|"6M"|"1Y": [{ date, label, income, expenses, net }] },
spending [{ id, name, amount }],
budget { spent, limit, warning, categories: [{ id, name, spent, limit }] } | null,
insights [{ id, title, body, actionLabel, actionHref?, prompt? }],
goals [{ id, name, current, target, targetDate }],
upcoming [{ id, date, name, amount }],
recentTransactions [{ id, date, description, category, amount }],
investments { connected, value, gain, gainPct, slices: [{ id, name, value }] },
debt { hasDebt, outstanding, monthlyPayments, items: [{ id, name, outstanding }] },
recommendations [{ id, index, title, body, actionLabel, actionHref?, prompt? }],
notifications [{ id, title, body, at }],
errors { [section]: { message } }
```

`hasLedger` is false when the user has no accounts and no posted transactions. Amounts on recent transactions are signed (income positive, expenses negative). Upcoming amounts are positive.

### Ledger (added)

`account_type`: `bank`, `savings`, `cash`, `credit_card`, `investment`, `loan`  
`transaction_type`: `income`, `expense`, `transfer`, `refund`, `adjustment`, `interest`, `fee`, `loan_payment`, `dividend`  
`status`: `posted` (default) or `pending` (upcoming)  
`goal_type`: `emergency_fund`, `education`, `home`, `vehicle`, `travel`, `investment`, `debt_payoff`, `savings`, `other`

| Method | Endpoint | Purpose | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/accounts` | List active accounts | — | `[{ id, name, account_type, description, balance, is_active }]` |
| `POST` | `/api/accounts` | Create an account | `{ "name", "account_type", "description?", "balance?" }` | same object (`201`) |
| `GET` | `/api/categories` | System + user categories | — | `[{ id, name, is_system, user_id }]` |
| `POST` | `/api/categories` | Create a user category | `{ "name", "description?" }` | same object (`201`) |
| `GET` | `/api/transactions` | Recent ledger events | Query `limit` (1–200, default 50) | `[{ id, account_id, transaction_type, status, amount, signed_amount, currency, description, merchant_name, transaction_date, category_id, category_name }]` |
| `POST` | `/api/transactions` | Record a movement | `{ "amount", "transaction_type", "account_id?", "category_id?", "description?", "merchant_name?", "transaction_date?", "status?", "transfer_account_id?" }` | same object (`201`). Omitting `account_id` creates a Cash account if none exist. Posted items update the account balance. |
| `GET` | `/api/goals` | List non-cancelled goals | — | `[{ id, name, goal_type, status, target_amount, current_amount, target_date, is_priority }]` |
| `POST` | `/api/goals` | Create a goal | `{ "name", "goal_type?", "target_amount", "current_amount?", "target_date", "description?", "is_priority?" }` | same object (`201`) |
| `GET` | `/api/budgets` | List monthly category limits | — | `[{ id, category_id, category_name, monthly_limit, spent }]` |
| `PUT` | `/api/budgets` | Create or update a category limit | `{ "category_id", "monthly_limit" }` | same object |

`POST /api/transactions` returns `400` with `{ "detail": "..." }` if the movement would take an account below zero, the category/account is missing, or a transfer is incomplete.

### Account (added)

Each page calls only its own resource. Responses use `{ "success": true, "message": "...", "data": ... }`.

| Method | Endpoint | Purpose | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/profile` | Load identity | — | `{ "id", "name", "email", "createdAt" }` |
| `PATCH` | `/api/profile` | Update name and/or email | `{ "name?", "email?" }` | same object. `409` if the email is taken. `400` if the body is empty. |
| `GET` | `/api/settings` | Load workspace settings (creates defaults on first read) | — | `{ "density": "comfortable"\|"compact", "notifyBudget", "notifyUpcoming", "notifyGoals" }` |
| `PATCH` | `/api/settings` | Update workspace settings | any subset of the GET fields | same object |
| `GET` | `/api/preferences` | Load financial preferences (creates defaults on first read) | — | `{ "currency": "INR", "riskTolerance": "conservative"\|"moderate"\|"aggressive", "monthlySavingsTargetPct", "emergencyFundMonths" }` |
| `PATCH` | `/api/preferences` | Update financial preferences | `{ "riskTolerance?", "monthlySavingsTargetPct?" (0–100), "emergencyFundMonths?" (1–24) }` | same object. Currency is not writable. |
| `GET` | `/api/security` | Password metadata and active sessions | — | `{ "email", "passwordChangedAt", "sessions": [{ "id", "createdAt", "expiresAt", "userAgent", "current" }] }` |
| `POST` | `/api/security/password` | Change password | `{ "current_password", "new_password" }` | `{ "token", "user": { "id", "name", "email", "createdAt" } }`. Revokes other sessions and returns a new JWT. `401` if the current password is wrong. |
| `POST` | `/api/security/sessions/{id}/revoke` | Revoke one device session | — | `{ "signedOut", "sessionId" }`. If it was this device, the cookie is cleared. |
| `POST` | `/api/security/signout-all` | Revoke every session and bump `token_version` | — | `{ "signedOut": true }` + cookie cleared |

JWTs issued at sign-in include `ver` (token version) and `jti` (session id). Tokens issued before this change still work until they expire, but they will not appear in the session list.

## Environment variables

Configured in `.env` (copy from `.env.example`). Do not commit `.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql+psycopg://postgres:postgres@localhost:5433/personal_cfo` |
| `SECRET_KEY` | Yes | At least 32 characters |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime, default `10080` (7 days) |
| `BACKEND_PORT` | No | Default `8000` |
| `LLM_API_KEY` / `LLM_MODEL` | No | Reserved until the agent is wired |

Frontend (Compose sets `NEXT_PUBLIC_API_URL`; native runs can use `frontend/.env.local`):

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | Default `http://localhost:8000` |

CORS allows `http://localhost:3000`.

## Database migrations

```bash
source .venv/bin/activate
alembic upgrade head
alembic revision --autogenerate -m "describe the change"
alembic downgrade -1
```

Docker already runs `alembic upgrade head` when the backend container starts.

## Repository layout

```text
ai-personal-CFO/
├── alembic/                      # Migrations
├── backend/app/
│   ├── main.py                   # FastAPI entry
│   ├── api/auth.py               # Signup / signin / me / signout
│   ├── api/dashboard.py          # GET /api/dashboard
│   ├── api/ledger.py             # Accounts, transactions, goals, budgets
│   ├── api/account.py            # Profile, settings, preferences, security
│   ├── models/                   # User, ledger, preferences, sessions
│   └── services/                 # Auth, dashboard, ledger, account
├── frontend/
│   ├── app/page.tsx              # Landing page
│   ├── app/(auth)/               # /signup and /signin
│   ├── app/(workspace)/          # Dashboard and subpages
│   ├── components/dashboard/     # Shell, panels, charts
│   └── lib/dashboard/            # Client fetch + preview fixture
├── docs/api/postman-auth.md
├── prompts/                      # Landing + dashboard design notes
├── docker-compose.yml
├── backend/Dockerfile
├── frontend/Dockerfile
├── requirements.txt
└── .env.example
```

## License

No license has been published yet. All rights reserved unless a `LICENSE` file is added.
