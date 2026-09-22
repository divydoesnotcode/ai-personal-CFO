# AI Personal CFO

An AI-powered personal finance platform that helps you understand cash flow, track accounts, set goals, and make better money decisions.

The signed-in dashboard is live against PostgreSQL: overview, health, cash flow, spending, budgets, goals, investments, debt, and recent activity are computed from the user’s ledger. Auth, ledger writes, profile, workspace settings, financial preferences, and session-aware security are wired. The conversational CFO agent and ML/RAG are not.

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

Local development needs four host tools. Everything else (Python packages, npm packages, PostgreSQL) is installed from this repo after those tools are in place.

| Tool | Version | Why |
| --- | --- | --- |
| [Git](https://git-scm.com/) | 2.40+ | Clone the repo |
| [Python](https://www.python.org/downloads/) | **3.14** | Backend, Alembic, `requirements.txt` |
| [Node.js](https://nodejs.org/) | **20.9+** (22 LTS recommended) | Next.js 16 frontend. Includes `npm` |
| [Docker](https://docs.docker.com/get-started/get-docker/) | Engine 24+ with **Compose v2** | Runs PostgreSQL 16 (`docker compose up postgres`) |

You also need a compiler toolchain on the host. Several packages in `requirements.txt` (NumPy, SciPy, XGBoost, SHAP, Numba, psycopg) expect it.

| Platform | Compiler / build tools |
| --- | --- |
| macOS | Xcode Command Line Tools |
| Linux | `build-essential` (gcc, g++, make) plus Python headers |
| Windows | Visual Studio Build Tools (C++), or develop inside **WSL2** |

**Do not install PostgreSQL on the host** unless you know you want that. The supported database is the `postgres` service in `docker-compose.yml`, published on **host port 5433**.

Optional, not required to start:

- A code editor (VS Code, Cursor, Zed, etc.)
- `psql` if you want a SQL shell against the container

Windows note: `uvloop` in `requirements.txt` does not support native Windows. **WSL2 (Ubuntu) is the recommended Windows setup.** Native Windows can still run Git, Node, and Docker Desktop; use WSL2 for the Python backend.

### macOS

1. Install Xcode Command Line Tools:

```bash
xcode-select --install
```

2. Install [Homebrew](https://brew.sh/) if you do not have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the printed `echo` / `eval` instructions so `brew` is on your `PATH` (Apple Silicon uses `/opt/homebrew`).

3. Install Git, Python 3.14, and Node.js:

```bash
brew update
brew install git python@3.14 node
```

Homebrew’s `node` formula includes `npm`. If `python3` is not 3.14:

```bash
brew link python@3.14
echo 'export PATH="$(brew --prefix python@3.14)/libexec/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

4. Install [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/). Open Docker Desktop once and wait until the engine is running.

   Apple Silicon and Intel both work. Grant the filesystem permission Docker asks for so Compose can mount this repo.

5. Confirm:

```bash
git --version
python3 --version    # 3.14.x
node --version       # v20.9+ or v22.x
npm --version
docker --version
docker compose version
```

### Linux

Commands below are for **Ubuntu / Debian**. Fedora / Arch equivalents are at the end of this subsection.

1. Update packages and install Git, compilers, and Python headers:

```bash
sudo apt update
sudo apt install -y \
  git \
  curl \
  ca-certificates \
  build-essential \
  python3-pip \
  python3-venv
```

2. Install **Python 3.14**. Ubuntu LTS may still ship an older default, so use the [deadsnakes PPA](https://launchpad.net/~deadsnakes/+archive/ubuntu/ppa) or [pyenv](https://github.com/pyenv/pyenv).

deadsnakes (Ubuntu):

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.14 python3.14-venv python3.14-dev
```

Use `python3.14` explicitly in the backend steps if `python3` is not 3.14.

3. Install **Node.js 22 LTS** (includes npm), via [NodeSource](https://github.com/nodesource/distributions) or [nvm](https://github.com/nvm-sh/nvm).

NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

4. Install **Docker Engine + Compose plugin** (Docker Desktop is optional on Linux). Official convenience script:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Log out and back in (or reboot) so the `docker` group applies. Then:

```bash
sudo systemctl enable --now docker
docker compose version
```

If `docker compose` is missing, install the plugin:

```bash
sudo apt install -y docker-compose-plugin
```

5. Confirm:

```bash
git --version
python3.14 --version
node --version
npm --version
docker --version
docker compose version
```

**Fedora**

```bash
sudo dnf install -y git gcc gcc-c++ make python3.14 python3.14-devel nodejs npm
# Docker: https://docs.docker.com/engine/install/fedora/
```

**Arch**

```bash
sudo pacman -S --needed git base-devel python nodejs npm docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

### Windows

**Recommended: WSL2 + Ubuntu**, then follow the Linux section *inside* the WSL distro. Docker Desktop for Windows can run Linux containers and talk to WSL.

#### A. Enable WSL2 (recommended)

In **PowerShell as Administrator**:

```powershell
wsl --install
```

Reboot if asked. Open **Ubuntu** from the Start menu, create your Linux user, then install Git, Python 3.14, Node.js, and Docker from the Linux section above.

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

You still need this on Windows itself:

The frontend image runs `npm ci` on start so the named `frontend_node_modules` volume matches `package-lock.json`. If Next reports `Module not found` after a new dependency, restart the frontend container (rebuild if you changed the Dockerfile):

```bash
docker compose restart frontend
docker compose up --build frontend
```

Useful Compose commands:

#### B. Native Windows (PowerShell / cmd)

`docker compose down` stops containers. Add `-v` only if you also want to delete the Postgres volume (that wipes stored users). Named volumes `frontend_node_modules` and `frontend_next` are also removed with `-v`.

Manual installers if you prefer not to use winget:

| Tool | Installer |
| --- | --- |
| Git | https://git-scm.com/download/win |
| Python 3.14 | https://www.python.org/downloads/windows/ |
| Node.js LTS | https://nodejs.org/ (LTS) |
| Docker Desktop | https://docs.docker.com/desktop/setup/install/windows-install/ |
| C++ build tools | https://visualstudio.microsoft.com/visual-cpp-build-tools/ — select **Desktop development with C++** |

Python installer checklist:

- Enable **Add python.exe to PATH**
- Enable **py launcher**
- Open a **new** terminal after install

Docker Desktop checklist:

- Enable WSL2 when the installer asks
- Start Docker Desktop and wait until it is running
- BIOS virtualization (VT-x / AMD-V) must be on

Close and reopen the terminal, then confirm:

```powershell
git --version
py -3.14 --version
node --version
npm --version
docker --version
docker compose version
```

If PowerShell blocks `Activate.ps1` later:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Windows activate: `.\.venv\Scripts\Activate.ps1`
If `python3` is not 3.14: `python3.14 -m venv .venv`

Run this from any shell after installing. Python on Windows is `py -3.14` instead of `python3`.

```bash
git --version
python3 --version          # Windows: py -3.14 --version
node --version
npm --version
docker --version
docker compose version
```

Expected: Python **3.14.x**, Node **v20.9+** (or **v22**), Docker Compose **v2**.

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

### 1. Clone and configure

```bash
git clone https://github.com/divydoesnotcode/ai-personal-CFO.git
cd ai-personal-CFO
```

Copy the env file:

```bash
# macOS / Linux / WSL
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Set `SECRET_KEY` in `.env` to a unique string of at least 32 characters:

```bash
# macOS / Linux / WSL
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

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

`LLM_API_KEY` and `LLM_MODEL` can stay empty for now.

### 2. Start PostgreSQL

Postgres is published on **host port 5433** so it does not collide with a local Postgres on 5432. Docker Desktop (or Docker Engine) must be running.

```bash
docker compose up -d postgres
docker compose ps
```

Wait until the `postgres` service is `healthy`.

### 3. Backend

macOS / Linux / WSL:

```bash
python3 -m venv .venv
# If python3 is not 3.14:
# python3.14 -m venv .venv

source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows (cmd / PowerShell), if you are not using WSL:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
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

Open [http://localhost:3000](http://localhost:3000). Signup UI: [http://localhost:3000/signup](http://localhost:3000/signup). Next.js defaults to port **3000** (`frontend/package.json` → `next dev`; Compose maps `3000:3000`). The frontend is set up to call `http://localhost:8000` (`NEXT_PUBLIC_API_URL`).

## Environment variables

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
# Apply all migrations
alembic upgrade head

# Autogenerate after model changes
alembic revision --autogenerate -m "describe the change"

# Roll back one revision
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