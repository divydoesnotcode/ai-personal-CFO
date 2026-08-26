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

Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) on the Windows side, enable **Use WSL 2 based engine**, and turn on integration for your Ubuntu distro (`Settings → Resources → WSL integration`).

You still need this on Windows itself:

- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (WSL2 backend)
- Optional: [Git for Windows](https://git-scm.com/download/win) if you also work from PowerShell/cmd

#### B. Native Windows (PowerShell / cmd)

Use this only if you are not using WSL. The Python backend may fail on `uvloop` and other Unix-only wheels.

Install with **winget** (Windows 10/11), or download the installers linked below.

```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.14 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Docker.DockerDesktop -e
```

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

### Verify the toolchain

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

## Quick start

These steps assume the tools above are installed and Docker is running.

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

# Windows
py -3.14 -c "import secrets; print(secrets.token_urlsafe(48))"
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

### 4. Frontend

In a **second** terminal (venv is not required):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signup UI: [http://localhost:3000/signup](http://localhost:3000/signup). Next.js defaults to port **3000** (`frontend/package.json` → `next dev`; Compose maps `3000:3000`). The frontend is set up to call `http://localhost:8000` (`NEXT_PUBLIC_API_URL`).

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