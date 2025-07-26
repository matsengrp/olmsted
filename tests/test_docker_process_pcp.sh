#!/bin/bash

echo "🧪 Olmsted Docker Image Test - PCP Data Processing"
echo "========================================================="

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <docker-image-1> [docker-image-2] ..."
    echo ""
    echo "Examples:"
    echo "  $0 olmsted:python3 olmsted:python3"
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
echo "🧹 Cleaning up existing PCP test directories..."
for img in "${SELECTED_IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    rm -rf "tests/_output_pcp_${output_name}"
done

# Test each selected image
for img in "${SELECTED_IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    output_dir="tests/_output_pcp_${output_name}"
    IMAGE_OUTPUT_DIR["$img"]="$output_dir"

    mkdir -p "$output_dir"

    echo "🚀 Testing PCP data processing in container: $img..."
    sudo docker run --rm \
        -v $(pwd)/example_data:/data \
        -v $(pwd)/$output_dir:/output \
        "$img" \
        python bin/process_pcp_data.py -i /data/pcp/test_pcp_data.csv -o /output \
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
echo "🔍 Checking PCP→AIRR conversion output structure..."

# Store validation results
declare -A IMAGE_VALID

# Validate each selected image's output structure
for img in "${SELECTED_IMAGES[@]}"; do
    if [ "${IMAGE_SUCCESS[$img]}" -eq 1 ]; then
        output_dir="${IMAGE_OUTPUT_DIR[$img]}"
        echo "📊 Validating $img output structure:"

        # Check for required AIRR format files
        datasets_file="$output_dir/datasets.json"
        clones_files_count=$(ls "$output_dir"/clones.*.json 2>/dev/null | wc -l)
        tree_files_count=$(ls "$output_dir"/tree.*.json 2>/dev/null | wc -l)

        valid=1

        if [ ! -f "$datasets_file" ]; then
            echo "  ❌ Missing datasets.json"
            valid=0
        else
            echo "  ✅ datasets.json found"
        fi

        if [ $clones_files_count -eq 0 ]; then
            echo "  ❌ No clones.*.json files found"
            valid=0
        else
            echo "  ✅ $clones_files_count clones.*.json files found"
        fi

        if [ $tree_files_count -eq 0 ]; then
            echo "  ❌ No tree.*.json files found"
            valid=0
        else
            echo "  ✅ $tree_files_count tree.*.json files found"
        fi

        # Basic JSON validation
        json_valid=1
        for json_file in "$output_dir"/*.json; do
            if [ -f "$json_file" ]; then
                if ! python3 -m json.tool "$json_file" > /dev/null 2>&1; then
                    echo "  ❌ Invalid JSON: $(basename "$json_file")"
                    json_valid=0
                    valid=0
                fi
            fi
        done

        if [ $json_valid -eq 1 ]; then
            echo "  ✅ All JSON files are valid"
        fi

        IMAGE_VALID["$img"]=$valid
        echo ""
    else
        echo "⚠️  Skipping $img validation - container failed"
        IMAGE_VALID["$img"]=0
    fi
done

# Final results
echo "🎯 PCP Test Results:"
echo ""
all_success=1
for img in "${SELECTED_IMAGES[@]}"; do
    if [ "${IMAGE_SUCCESS[$img]}" -eq 1 ] && [ "${IMAGE_VALID[$img]}" -eq 1 ]; then
        echo "  ✅ $img: Container runs and produces valid AIRR format output"
    else
        echo "  ❌ $img: Failed"
        all_success=0
        if [ "${IMAGE_SUCCESS[$img]}" -eq 0 ]; then
            echo "     Debug with: sudo docker run --rm -v \$(pwd)/example_data:/data $img python bin/process_pcp_data.py -i /data/pcp/test_pcp_data.csv -o /output -v"
        fi
    fi
done

echo ""
if [ $all_success -eq 1 ]; then
    echo "🎉 SUCCESS: All PCP tests passed!"
    echo "✅ PCP data successfully converts to AIRR format"
else
    echo "❌ FAILURE: Some PCP tests failed"
fi
