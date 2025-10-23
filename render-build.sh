#!/usr/bin/env bash
set -e

echo " Building project for Render..."

# --- Build frontend ---
echo ""
echo " Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

# --- Install backend dependencies ---
echo ""
echo " Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo " Build complete! Ready for Render deployment."
