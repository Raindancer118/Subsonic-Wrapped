#!/bin/bash

# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker could not be found. Please install Docker."
    exit 1
fi

echo "Building and starting Subsonic Wrapped..."

# Extract PORT from config.yml if available
if [ -f "config.yml" ]; then
    PORT=$(grep "port:" config.yml | awk '{print $2}' | tr -d '"' | tr -d "'")
fi

# Default to 3000 if not set
export PORT=${PORT:-3000}
echo "Using PORT=$PORT"

docker compose up --build -d

echo "App running at http://localhost:$PORT"
