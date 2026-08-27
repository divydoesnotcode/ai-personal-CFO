FROM python:3.14-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY backend ./backend

EXPOSE 8000

WORKDIR /tmp

# `alembic/` in the repo shadows the installed library if /app is on
# PYTHONPATH. Run migrations with a clean path, then start the API.
CMD ["sh", "-c", "PYTHONPATH= alembic -c /app/alembic.ini upgrade head && PYTHONPATH=/app uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/backend --app-dir /app"]
