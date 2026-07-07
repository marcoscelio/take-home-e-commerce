#!/bin/sh
set -e

mkdir -p /app/db

npx prisma migrate deploy
npx tsx prisma/seed.ts

exec npm start
