#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================"
echo "   KitaPlaner Pro - Personal- & Dienstplanung"
echo "========================================================"

if [ ! -d "node_modules" ]; then
    echo "📦 Installiere Abhängigkeiten..."
    npm install
fi

if [ ! -d "dist/client" ]; then
    echo "🔨 Baue Frontend & Backend..."
    npm run build
fi

echo "🚀 Starte KitaPlaner Pro auf http://localhost:3000 ..."
PORT=3000 node dist/server/index.js
