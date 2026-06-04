#!/usr/bin/env bash
set -e

echo "==> Checking Node.js..."
node --version || { echo "ERROR: Node.js not found"; exit 1; }

echo "==> Installing dependencies..."
npm install

echo "==> Type-checking..."
npm run typecheck

echo "==> Running tests..."
npm run test

echo "==> Building..."
npm run build

echo ""
echo "Environment ready."
