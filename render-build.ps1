Write-Host " Building project for Render..." -ForegroundColor Cyan

# --- Build frontend ---
Write-Host ""
Write-Host " Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

# --- Install backend dependencies ---
Write-Host ""
Write-Host " Installing backend dependencies..."
cd backend
npm install
cd ..

Write-Host ""
Write-Host "Build complete! Ready for Render deployment." -ForegroundColor Green
