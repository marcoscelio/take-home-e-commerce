FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/prod.db"

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

RUN npx prisma generate && npm run build

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
