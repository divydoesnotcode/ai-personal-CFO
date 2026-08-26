# AI Personal CFO

An AI-powered personal finance platform that helps you understand cash flow, track accounts, set goals, and make better money decisions.

This repository is the early foundation: a FastAPI backend, PostgreSQL financial schema, Next.js frontend, and working email/password auth.

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)

## What you need to install

| Tool | Version | Why |
| --- | --- | --- |
| [Git](https://git-scm.com/) | 2.40+ | Clone the repo |
| [Python](https://www.python.org/downloads/) | **3.14** | Backend |
| [Node.js](https://nodejs.org/) | **20.9+** (22 LTS recommended) | Frontend. Includes `npm` |
| [Docker](https://docs.docker.com/get-started/get-docker/) | Engine 24+ with **Compose v2** | PostgreSQL 16 |

Also install a compiler toolchain: Xcode Command Line Tools (macOS), `build-essential` (Linux), or Visual Studio C++ Build Tools / **WSL2** (Windows).

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

Use **three terminals** from the repo root. Docker Desktop (or Docker Engine) must already be running.

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

### 1. PostgreSQL

From the repo root:

```bash
docker compose up -d postgres
docker compose ps
```

Wait until `postgres` is `healthy`. Host port is **5433**.

### 2. Backend (port 8000)

From the repo root:

```bash
source .venv/bin/activate
alembic upgrade head
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows activate: `.\.venv\Scripts\Activate.ps1`  
If `python3` is not 3.14: `python3.14 -m venv .venv`

| URL | Purpose |
| --- | --- |
| http://localhost:8000 | API info |
| http://localhost:8000/health | Liveness |
| http://localhost:8000/ready | Readiness |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/redoc | ReDoc |

The API will not start if Postgres is down.

### 3. Frontend (port 3000)

Second terminal — no venv required:

```bash
cd frontend
npm run dev
```

| URL | Purpose |
| --- | --- |
| http://localhost:3000 | App |
| http://localhost:3000/signup | Create account |
| http://localhost:3000/signin | Sign in |

The frontend calls `http://localhost:8000` (`NEXT_PUBLIC_API_URL`). Copy `frontend/.env.example` to `frontend/.env.local` if you need to override that.

## View data in the database

Signup rows land in the `users` table.

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
  (SELECT count(*) FROM financial_goals) AS financial_goals;
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

## Auth APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Register (`name`, `email`, `password`) |
| `POST` | `/api/auth/signin` | Sign in (`email`, `password`) → JWT + httpOnly cookie |
| `GET` | `/api/auth/me` | Current user (`Authorization: Bearer <token>`) |

Postman payloads, headers, and expected responses: [docs/api/postman-auth.md](docs/api/postman-auth.md).

## Environment variables

Configured in `.env` (copy from `.env.example`). Do not commit `.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql+psycopg://postgres:postgres@localhost:5433/personal_cfo` |
| `SECRET_KEY` | Yes | At least 32 characters |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime, default `10080` (7 days) |
| `BACKEND_PORT` | No | Default `8000` |
| `LLM_API_KEY` / `LLM_MODEL` | No | Reserved |

CORS allows `http://localhost:3000`.

## Database migrations

```bash
source .venv/bin/activate
alembic upgrade head
alembic revision --autogenerate -m "describe the change"
alembic downgrade -1
```

## Repository layout

```text
ai-personal-CFO/
├── alembic/                 # Migrations
├── backend/app/
│   ├── main.py              # FastAPI entry
│   ├── api/auth.py          # Signup / signin / me
│   ├── models/              # SQLAlchemy schema
│   └── services/            # Auth business logic
├── frontend/                # Next.js App Router
│   └── app/(auth)/          # /signup and /signin
├── docs/api/postman-auth.md
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## License

No license has been published yet. All rights reserved unless a `LICENSE` file is added.
