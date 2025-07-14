#!/bin/bash

echo "🧪 Olmsted Python 2 to Python 3 Migration Test"
echo "=================================================="

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <docker-image-1> [docker-image-2] ..."
    echo ""
    echo "Examples:"
    echo "  $0 olmsted:python2"
    echo "  $0 olmsted:python3"
    echo "  $0 olmsted:python2 olmsted:python3"
    echo ""
    exit 1
fi

# Change to project root if running from tests directory
if [[ $(basename "$PWD") == "tests" ]]; then
    cd ..
fi
echo "PWD: $PWD"

# Initialize arrays to store selected images and their results
declare -a SELECTED_IMAGES
declare -A IMAGE_SUCCESS
declare -A IMAGE_OUTPUT_DIR

# Get Docker images from command line arguments
SELECTED_IMAGES=("$@")

echo ""
echo "📋 Selected images:"
for img in "${SELECTED_IMAGES[@]}"; do
    echo "  - $img"
done
echo ""

# Clean up any existing test directories
echo "🧹 Cleaning up existing test directories..."
for img in "${SELECTED_IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    rm -rf "tests/output_${output_name}"
done

# Test each selected image
for img in "${SELECTED_IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    output_dir="tests/output_${output_name}"
    IMAGE_OUTPUT_DIR["$img"]="$output_dir"

    mkdir -p "$output_dir"

    echo "🐍 Testing container: $img..."
    sudo docker run --rm \
        -v $(pwd)/example_data:/data \
        -v $(pwd)/$output_dir:/output \
        "$img" \
        python bin/process_data.py -i /data/full_schema_dataset.json -o /output \
        -v

    if [ $? -eq 0 ]; then
        echo "✅ $img completed successfully"
        IMAGE_SUCCESS["$img"]=1
    else
        echo "❌ $img failed"
        IMAGE_SUCCESS["$img"]=0
    fi
    echo ""
done

echo ""
echo "📊 File counts:"
for img in "${SELECTED_IMAGES[@]}"; do
    output_dir="${IMAGE_OUTPUT_DIR[$img]}"
    file_count=$(ls "$output_dir"/*.json 2>/dev/null | wc -l)
    echo "$img output: $file_count files"
done

echo ""
echo "🔍 Comparing outputs against golden reference..."

# Store comparison results
declare -A IMAGE_MATCH

# Compare each selected image's output against golden reference
for img in "${SELECTED_IMAGES[@]}"; do
    if [ "${IMAGE_SUCCESS[$img]}" -eq 1 ]; then
        output_dir="${IMAGE_OUTPUT_DIR[$img]}"
        echo "📊 $img vs Golden Reference:"
        python3 tests/compare_outputs.py example_data/build_data "$output_dir" --name1 "Golden Reference" --name2 "$img"
        IMAGE_MATCH["$img"]=$?
        echo ""
    else
        echo "⚠️  Skipping $img comparison - container failed"
        IMAGE_MATCH["$img"]=1
    fi
done

# Final results
echo "🎯 Migration Test Results:"
echo ""
all_success=1
for img in "${SELECTED_IMAGES[@]}"; do
    if [ "${IMAGE_SUCCESS[$img]}" -eq 1 ] && [ "${IMAGE_MATCH[$img]}" -eq 0 ]; then
        echo "  ✅ $img: Container runs and output matches golden reference"
    else
        echo "  ❌ $img: Failed"
        all_success=0
        if [ "${IMAGE_SUCCESS[$img]}" -eq 0 ]; then
            echo "     Debug with: sudo docker run --rm -v \$(pwd)/example_data:/data $img python bin/process_data.py -i /data/full_schema_dataset.json -o /output -v"
        fi
    fi
done

echo ""
# Check if any Python 3 image was tested and succeeded
py3_tested=0
py3_success=0
for img in "${SELECTED_IMAGES[@]}"; do
    if [[ "$img" == *"python3"* ]]; then
        py3_tested=1
        if [ "${IMAGE_SUCCESS[$img]}" -eq 1 ] && [ "${IMAGE_MATCH[$img]}" -eq 0 ]; then
            py3_success=1
        fi
    fi
done

if [ $py3_tested -eq 1 ]; then
    if [ $py3_success -eq 1 ]; then
        echo "🎉 SUCCESS: At least one Python 3 container is verified!"
        echo "✅ Python 3 produces identical output to the golden reference"
    else
        echo "❌ FAILURE: Python 3 migration needs review"
    fi
else
    if [ $all_success -eq 1 ]; then
        echo "✅ All selected containers passed tests"
    else
        echo "❌ Some containers failed tests"
    fi
fi
