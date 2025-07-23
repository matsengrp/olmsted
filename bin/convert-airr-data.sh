#!/bin/bash

# Usage: convert-airr-data.sh <input_file> [docker_image]
# Examples:
#   convert-airr-data.sh full_schema_dataset.json
#   convert-airr-data.sh full_schema_dataset.json build_data/ olmsted:python3
#   convert-airr-data.sh full_schema_dataset.json build_data/ quay.io/matsengrp/olmsted:latest

if [ $# -eq 0 ]; then
    echo "Usage: $0 <input_file> <output_dir> [docker_image]"
    echo "  input_file: JSON file to process"
    echo "  output_dir: Directory to save processed data"
    echo "  docker_image: Docker image to use (default: quay.io/matsengrp/olmsted)"
    exit 1
fi

INPUT_FILE="$1"
DOCKER_TAG_OR_IMAGE="${2:-quay.io/matsengrp/olmsted}"
OUTPUT_DIR="${3:-build_data}"

# If the argument contains ':', treat it as a full image name
# Otherwise, assume it's a tag for quay.io/matsengrp/olmsted
if [[ "$DOCKER_TAG_OR_IMAGE" == *":"* ]]; then
    DOCKER_IMAGE="$DOCKER_TAG_OR_IMAGE"
else
    DOCKER_IMAGE="quay.io/matsengrp/olmsted:$DOCKER_TAG_OR_IMAGE"
fi

echo "Processing $INPUT_FILE with Docker image: $DOCKER_IMAGE"

docker run --rm -v $PWD:/data "$DOCKER_IMAGE" bin/process_data.py -i /data/"$INPUT_FILE" -o /data/"$OUTPUT_DIR" -n inferred_naive

echo "Processing completed and saved to: $OUTPUT_DIR"
