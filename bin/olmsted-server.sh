#!/bin/bash

# Usage: olmsted-server.sh <docker_tag_or_image> [port]
# Examples:
#   olmsted-server.sh latest
#   olmsted-server.sh python3 8080
#   olmsted-server.sh quay.io/matsengrp/olmsted:latest 3999

if [ $# -eq 0 ]; then
    echo "Usage: $0 <docker_tag_or_image> [port]"
    echo "  docker_tag_or_image: Docker tag (e.g., 'latest', 'python3') or full image name"
    echo "  port: Local port to use (default: 3999)"
    echo ""
    echo "Examples:"
    echo "  $0 latest"
    echo "  $0 python3 3999"
    echo "  $0 olmsted:python3"
    echo "  $0 quay.io/matsengrp/olmsted:latest"
    exit 1
fi

DOCKER_TAG_OR_IMAGE="$1"
HOST_PORT="${2:-3999}"
DOCKER_PORT="8080"

# If the argument contains ':', treat it as a full image name
# Otherwise, assume it's a tag for quay.io/matsengrp/olmsted
if [[ "$DOCKER_TAG_OR_IMAGE" == *":"* ]]; then
    DOCKER_IMAGE="$DOCKER_TAG_OR_IMAGE"
else
    DOCKER_IMAGE="quay.io/matsengrp/olmsted:$DOCKER_TAG_OR_IMAGE"
fi

echo "Starting Olmsted server with Docker image: $DOCKER_IMAGE"
echo "Using port: $HOST_PORT"

set -x
docker run -p ${HOST_PORT}:${DOCKER_PORT} -v $PWD:/data "${DOCKER_IMAGE}" npm start localData /data

