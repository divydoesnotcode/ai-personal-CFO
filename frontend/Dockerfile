FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Reinstall from the lockfile so the named node_modules volume stays in sync.
CMD ["sh", "-c", "npm ci && npm run dev -- --hostname 0.0.0.0 --port 3000"]
