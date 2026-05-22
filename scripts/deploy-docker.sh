#!/usr/bin/env bash
set -euo pipefail

# Navigation to project root relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "🚀 Starting Docker Continuous Delivery Pipeline for MealBuddy..."

# Pull latest images
echo "📥 Pulling latest Docker images from registry..."
docker compose pull

# Start/recreate containers gracefully
echo "🔄 Recreating containers gracefully..."
docker compose up -d --remove-orphans

# Wait briefly for database to ensure it is fully ready
echo "⏱️ Waiting for PostgreSQL to be healthy..."
# We try to check health of PG container
docker compose exec -T postgres sh -c 'until pg_isready -U "${POSTGRES_USER:-mealbuddy}" -d "${POSTGRES_DB:-mealbuddy}"; do echo "Waiting for database..." && sleep 1; done'

# Run migrations inside backend
echo "🗄️ Running database migrations..."
docker compose exec -T backend php artisan migrate --force

# Optimize Laravel cache inside container
echo "⚡ Optimizing Laravel caching..."
docker compose exec -T backend php artisan config:cache
docker compose exec -T backend php artisan route:cache
docker compose exec -T backend php artisan view:cache

# Clean up old unused docker images to save disk space
echo "🧹 Pruning old unused Docker images..."
docker image prune -f

echo "✨ Docker deployment completed successfully!"
