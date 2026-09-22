FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=5678

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 5678

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "5678"]
