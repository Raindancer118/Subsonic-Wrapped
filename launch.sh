#!/bin/bash

# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker could not be found. Please install Docker."
    exit 1
fi

echo "Building and starting Subsonic Wrapped..."
docker compose up --build -d

echo "App running at http://localhost:3000"
