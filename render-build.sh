#!/bin/bash
echo " Installing frontend dependencies..."
cd frontend
npm install
echo " Building frontend..."
npx vite build
cd ..
echo " Build complete! Ready for Render deployment."
