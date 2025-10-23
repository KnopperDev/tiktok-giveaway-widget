#!/usr/bin/env bash
# Build script for Render (root of repo)

set -e

echo "🚀 Installing frontend dependencies..."
cd frontend
npm ci

echo "🏗️ Building frontend..."
npx vite build

echo "📦 Installing backend dependencies..."
cd ../backend
npm ci

echo "✅ Build complete!"
