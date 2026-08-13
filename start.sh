#!/bin/bash
# Start the portfolio backend (serves the API and the frontend).

set -e

cd "$(dirname "$0")/backend"

# Install backend dependencies if missing
if [ -d ".venv" ]; then
  source .venv/bin/activate
  pip install -q -r requirements.txt
  PY=python
else
  # Fall back to system Python when python3-venv is unavailable
  pip install --break-system-packages -q -r requirements.txt 2>/dev/null || pip install -q -r requirements.txt
  PY=python3
fi

# Load .env if present
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

echo "Starting portfolio server on http://localhost:${PORT:-5000}"
exec $PY app.py
