#!/bin/bash

# Usage: olmsted-server-local.sh [data_directory] [port] [mode]
# Examples:
#   olmsted-server-local.sh
#   olmsted-server-local.sh /path/to/data 3999
#   olmsted-server-local.sh /path/to/data 3999 production
#   olmsted-server-local.sh example_data/build_data 3999 dev

set -e

# Check for help flags first
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Usage: $0 [data_directory] [port] [mode]"
    echo ""
    echo "Start Olmsted server using local installation"
    echo ""
    echo "Arguments:"
    echo "  data_directory: Path to data directory (default: example_data/build_data)"
    echo "  port: Local port to use (default: 3999)"
    echo "  mode: Server mode - 'dev' or 'production' (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 /path/to/data"
    echo "  $0 /path/to/data 8080"
    echo "  $0 /path/to/data 3999 production"
    echo "  $0 example_data/build_data 3999 dev"
    echo ""
    echo "Modes:"
    echo "  dev         Development mode with hot reloading (default)"
    echo "  production  Production mode with build step"
    echo ""
    echo "Options:"
    echo "  -h, --help  Show this help message"
    exit 0
fi

# Default values
DEFAULT_DATA_DIR="example_data/build_data"
DEFAULT_HOST_PORT="3999"
DEFAULT_MODE="dev"

# Parse arguments
DATA_DIR="${1:-$DEFAULT_DATA_DIR}"
HOST_PORT="${2:-$DEFAULT_HOST_PORT}"
MODE="${3:-$DEFAULT_MODE}"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the olmsted directory (parent of bin)
OLMSTED_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================="
echo "Starting Olmsted Server (Local Installation)"
echo "============================================="
echo "Olmsted directory: $OLMSTED_DIR"
echo "Data directory: $DATA_DIR"
echo "Port: $HOST_PORT"
echo "Mode: $MODE"
echo "============================================="

# Change to olmsted directory
cd "$OLMSTED_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "ERROR: node_modules not found. Please run 'npm install' first."
    exit 1
fi

# Check if data directory exists
if [ ! -d "$DATA_DIR" ]; then
    echo "WARNING: Data directory '$DATA_DIR' not found."
    echo "Available example data directories:"
    find . -name "*data*" -type d -maxdepth 2 2>/dev/null | head -5 || true
    echo ""
    echo "You can:"
    echo "  1. Create the directory: mkdir -p '$DATA_DIR'"
    echo "  2. Use a different directory as the first argument"
    echo "  3. Continue anyway (server will start but may not have data)"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Convert relative data directory to absolute path
if [[ "$DATA_DIR" != /* ]]; then
    DATA_DIR="$(cd "$DATA_DIR" 2>/dev/null && pwd)" || DATA_DIR="$PWD/$DATA_DIR"
fi

echo "Using data directory: $DATA_DIR"
echo "Starting server..."
echo ""

# Start the server based on mode
if [ "$MODE" = "production" ]; then
    # Production mode: build first, then run
    echo "Building for production..."
    npm run build

    echo "Starting production server..."
    # The production server reads from localDataPath
    BABEL_ENV=production node server.dist.js localData "$DATA_DIR" "$HOST_PORT"

elif [ "$MODE" = "dev" ]; then
    # Development mode: use babel-node with hot reloading
    echo "Starting development server with hot reloading..."
    BABEL_ENV=dev ./node_modules/.bin/babel-node server.js dev localData "$DATA_DIR" "$HOST_PORT"

else
    echo "ERROR: Invalid mode '$MODE'. Use 'dev' or 'production'."
    exit 1
fi
