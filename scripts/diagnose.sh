#!/bin/bash
# scripts/diagnose.sh
# Run this on your VPS to diagnose the Navidrome/ListenBrainz connection issue.

echo "=== DIAGNOSTIC REPORT ==="
echo "Date: $(date)"
echo "-------------------------"

echo "[1] Checking for Code Updates..."
# Check for the validate-token route in the source code
if grep -q "validate-token" backend/src/routes/listenbrainz.ts; then
    echo "✅ backend/src/routes/listenbrainz.ts contains 'validate-token'. Code is updated."
else
    echo "❌ backend/src/routes/listenbrainz.ts DOES NOT contain 'validate-token'. PLEASE GIT PULL."
fi

echo "-------------------------"
echo "[2] Checking Container Status..."
docker compose ps

echo "-------------------------"
echo "[3] Checking App Logs (Last 20 lines)..."
docker compose logs --tail=20 app

echo "-------------------------"
echo "[4] Testing Local Connection to ListenBrainz API..."
# Try to reach the endpoint internally. 
# We don't have a valid token here, but we check if we get 401 (JSON) or 404/500 (HTML/Error).
# If we get HTML (<!DOCTYPE...), that's the "invalid character '<'" error source.

RESPONSE=$(curl -s -v http://localhost:3075/api/listenbrainz/1/validate-token 2>&1)

if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Endpoint reachable and returned 401 Unauthorized (JSON). This is GOOD."
    echo "   Navidrome should expect this structure (or 200 with valid token)."
elif echo "$RESPONSE" | grep -q "<!doctype html>"; then
    echo "❌ Endpoint returned HTML! This causes the 'invalid character <' error."
    echo "   Reason: Request likely fell through to 404 handler (React App) or 500 error page."
else
    echo "⚠️  Unexpected response:"
    echo "$RESPONSE"
fi

echo "-------------------------"
echo "[5] Checking Database..."
docker compose exec app ls -l /app/data/app.db

echo "=== END REPORT ==="
