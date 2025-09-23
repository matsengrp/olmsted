#!/bin/bash

# Usage: olmsted-server.sh <docker_tag_or_image> [port]
# Examples:
#   olmsted-server.sh latest
#   olmsted-server.sh python3 8080
#   olmsted-server.sh quay.io/matsengrp/olmsted:latest 3999

# Check for help flags
if [ "$1" = "-h" ] || [ "$1" = "--help" ] || [ $# -eq 0 ]; then
    echo "Usage: $0 <docker_tag_or_image> [port]"
    echo ""
    echo "Start Olmsted server using Docker"
    echo ""
    echo "Arguments:"
    echo "  docker_tag_or_image: Docker tag (e.g., 'latest', 'python3') or full image name"
    echo "  port: Local port to use (default: 3999)"
    echo ""
    echo "Examples:"
    echo "  $0 latest"
    echo "  $0 python3 3999"
    echo "  $0 olmsted:python3"
    echo "  $0 quay.io/matsengrp/olmsted:latest"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    exit 1
fi

# Default values
DEFAULT_HOST_PORT="3999"
DEFAULT_DOCKER_PORT="3999"
DEFAULT_MODE="dev"

# Parse arguments
DOCKER_TAG_OR_IMAGE="$1"
HOST_PORT="${2:-DEFAULT_HOST_PORT}"
DOCKER_PORT="${DEFAULT_DOCKER_PORT}"
MODE="${3:-$DEFAULT_MODE}"

# If the argument contains ':', treat it as a full image name
# Otherwise, assume it's a tag for quay.io/matsengrp/olmsted
if [[ "$DOCKER_TAG_OR_IMAGE" == *":"* ]]; then
    DOCKER_IMAGE="$DOCKER_TAG_OR_IMAGE"
else
    DOCKER_IMAGE="quay.io/matsengrp/olmsted:$DOCKER_TAG_OR_IMAGE"
fi

echo "============================================="
echo "Starting Olmsted Server (Docker Image)"
echo "============================================="
echo "Docker image: $DOCKER_IMAGE"
echo "Host Port: $HOST_PORT"
echo "============================================="

set -x
docker run -p ${HOST_PORT}:${DOCKER_PORT} -v $PWD:/data "${DOCKER_IMAGE}" \
    npm start localData /data

