#!/usr/bin/env bash
set -euo pipefail

# Navigation to project root relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "🚀 Starting Traditional Git-Pull Continuous Delivery for MealBuddy..."

# Navigate to backend and put it into maintenance mode
echo "🚧 Putting Laravel into maintenance mode..."
cd "${PROJECT_ROOT}/backend"
php artisan down || true

# Pull latest code
echo "📥 Pulling latest code changes from origin..."
cd "${PROJECT_ROOT}"
git pull

# Build Backend dependencies & optimize
echo "📦 Installing Composer dependencies..."
cd "${PROJECT_ROOT}/backend"
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

echo "🗄️ Running Laravel migrations..."
php artisan migrate --force

echo "⚡ Optimizing Laravel caching..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Build Frontend assets & restart
echo "📦 Installing Next.js node dependencies..."
cd "${PROJECT_ROOT}/frontend"
npm install --no-audit --no-fund

echo "🏗️ Building Next.js production bundle..."
npm run build

# Restart Next.js daemon if PM2 is present
if command -v pm2 &> /dev/null; then
  echo "🔄 PM2 detected! Restarting Next.js frontend service..."
  pm2 restart mealbuddy-frontend || pm2 start npm --name "mealbuddy-frontend" -- start
else
  echo "⚠️ PM2 not found. Ensure your Next.js daemon process is restarted/running."
fi

# Take Laravel out of maintenance mode
echo "✅ Bringing Laravel back online..."
cd "${PROJECT_ROOT}/backend"
php artisan up || true

echo "✨ Traditional SSH deployment completed successfully!"
