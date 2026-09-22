FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
