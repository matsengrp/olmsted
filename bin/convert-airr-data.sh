#!/bin/bash

# Usage: convert-airr-data.sh <input_file> [docker_image]
# Examples:
#   convert-airr-data.sh full_schema_dataset.json
#   convert-airr-data.sh full_schema_dataset.json olmsted:python3
#   convert-airr-data.sh full_schema_dataset.json quay.io/matsengrp/olmsted:latest

if [ $# -eq 0 ]; then
    echo "Usage: $0 <input_file> [docker_image]"
    echo "  input_file: JSON file to process"
    echo "  docker_image: Docker image to use (default: quay.io/matsengrp/olmsted)"
    exit 1
fi

INPUT_FILE="$1"
DOCKER_IMAGE="${2:-quay.io/matsengrp/olmsted}"

echo "Processing $input_file with Docker image: $docker_image"

docker run --rm -v $PWD:/data "$DOCKER_IMAGE" bin/process_data.py -i /data/"$INPUT_FILE" -o /data/build_data -n inferred_naive
