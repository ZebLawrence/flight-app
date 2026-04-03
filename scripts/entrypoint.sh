#!/bin/sh
set -e

echo "Running database migrations..."
node scripts/migrate.js

echo "Starting Next.js server..."
exec node server.js
