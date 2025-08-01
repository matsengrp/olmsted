#!/bin/bash

echo "🧪 Olmsted Docker Image Test - Unified Data Processing (Auto-detect)"
echo "===================================================================="

# Initialize variables
VERBOSE=false
declare -a SELECTED_IMAGES
declare -A IMAGE_SUCCESS_AIRR
declare -A IMAGE_SUCCESS_PCP
declare -A IMAGE_OUTPUT_DIR_AIRR
declare -A IMAGE_OUTPUT_DIR_PCP

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] <docker-image-1> [docker-image-2] ..."
    echo ""
    echo "This script tests the unified process_data.py with auto-detection"
    echo "for both AIRR JSON and PCP CSV formats."
    echo ""
    echo "Options:"
    echo "  -v, --verbose    Enable verbose output"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 olmsted:python3"
    echo "  $0 -v olmsted:python3 olmsted:latest"
    echo "  $0 --verbose olmsted:python3"
    echo ""
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            # Collect image names
            SELECTED_IMAGES+=("$1")
            shift
            ;;
    esac
done

# Check if we have images to test
if [ ${#SELECTED_IMAGES[@]} -eq 0 ]; then
    echo "Error: No Docker images specified"
    show_usage
    exit 1
fi

# Change to project root (parent of script directory)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."
[ "$VERBOSE" = true ] && echo "Working directory: $PWD"

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
    [ "$VERBOSE" = true ] && echo "  Removing: tests/_output_unified_airr_${output_name}"
    [ "$VERBOSE" = true ] && echo "  Removing: tests/_output_unified_pcp_${output_name}"
    rm -rf "tests/_output_unified_airr_${output_name}"
    rm -rf "tests/_output_unified_pcp_${output_name}"
done

echo ""
echo "🔄 Testing auto-detection with unified process_data.py..."
echo ""

# Test AIRR format with auto-detection
echo "📂 Part 1: Testing AIRR JSON format auto-detection"
echo "==========================================="
for img in "${SELECTED_IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    output_dir="tests/_output_unified_airr_${output_name}"
    IMAGE_OUTPUT_DIR_AIRR["$img"]="$output_dir"

    mkdir -p "$output_dir"

    echo "🐍 Testing AIRR auto-detection in container: $img..."
    
    # Build docker command - Note: using process_data.py without -f flag
    docker_cmd="sudo docker run --rm \
        -v $(pwd)/example_data:/data \
        -v $(pwd)/$output_dir:/output \
        $img \
        python bin/process_data.py -i /data/airr/full_schema_dataset.json -o /output \
        --validate --seed 42"
    
    # Add verbosity to the python command if requested
    if [ "$VERBOSE" = true ]; then
        docker_cmd="$docker_cmd -v"
        echo "  Docker command: $docker_cmd"
    fi
    
    # Execute the command
    eval "$docker_cmd"

    if [ $? -eq 0 ]; then
        echo "✅ $img AIRR processing completed successfully"
        IMAGE_SUCCESS_AIRR["$img"]=1
    else
        echo "❌ $img AIRR processing failed"
        IMAGE_SUCCESS_AIRR["$img"]=0
    fi
    echo ""
done

# Test PCP format with auto-detection
echo "📂 Part 2: Testing PCP CSV format auto-detection"
echo "=========================================="
for img in "${SELECTED_IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    output_dir="tests/_output_unified_pcp_${output_name}"
    IMAGE_OUTPUT_DIR_PCP["$img"]="$output_dir"

    mkdir -p "$output_dir"

    echo "🚀 Testing PCP auto-detection in container: $img..."
    
    # Build docker command - Note: using process_data.py without -f flag
    docker_cmd="sudo docker run --rm \
        -v $(pwd)/example_data:/data \
        -v $(pwd)/$output_dir:/output \
        $img \
        python bin/process_data.py -i /data/pcp/test_pcp_data.csv -o /output \
        --validate --seed 42"
    
    # Add verbosity to the python command if requested
    if [ "$VERBOSE" = true ]; then
        docker_cmd="$docker_cmd -v"
        echo "  Docker command: $docker_cmd"
    fi
    
    # Execute the command
    eval "$docker_cmd"

    if [ $? -eq 0 ]; then
        echo "✅ $img PCP processing completed successfully"
        IMAGE_SUCCESS_PCP["$img"]=1
    else
        echo "❌ $img PCP processing failed"
        IMAGE_SUCCESS_PCP["$img"]=0
    fi
    echo ""
done

echo ""
echo "📊 File counts:"
echo "AIRR outputs:"
for img in "${SELECTED_IMAGES[@]}"; do
    output_dir="${IMAGE_OUTPUT_DIR_AIRR[$img]}"
    file_count=$(ls "$output_dir"/*.json 2>/dev/null | wc -l)
    echo "  $img: $file_count files"
done
echo ""
echo "PCP outputs:"
for img in "${SELECTED_IMAGES[@]}"; do
    output_dir="${IMAGE_OUTPUT_DIR_PCP[$img]}"
    file_count=$(ls "$output_dir"/*.json 2>/dev/null | wc -l)
    echo "  $img: $file_count files"
done

echo ""
echo "🔍 Comparing outputs against golden references..."

# Store comparison results
declare -A IMAGE_MATCH_AIRR
declare -A IMAGE_MATCH_PCP

# Compare AIRR outputs
echo ""
echo "AIRR comparisons:"
for img in "${SELECTED_IMAGES[@]}"; do
    if [ "${IMAGE_SUCCESS_AIRR[$img]}" -eq 1 ]; then
        output_dir="${IMAGE_OUTPUT_DIR_AIRR[$img]}"
        echo "📊 $img AIRR vs Golden Reference:"
        [ "$VERBOSE" = true ] && echo "  Comparing: example_data/airr/golden_airr_data vs $output_dir"
        python3 tests/compare_outputs.py example_data/airr/golden_airr_data "$output_dir" --name1 "Golden AIRR" --name2 "$img"
        IMAGE_MATCH_AIRR["$img"]=$?
        echo ""
    else
        echo "⚠️  Skipping $img AIRR comparison - processing failed"
        IMAGE_MATCH_AIRR["$img"]=1
    fi
done

# Compare PCP outputs
echo "PCP comparisons:"
for img in "${SELECTED_IMAGES[@]}"; do
    if [ "${IMAGE_SUCCESS_PCP[$img]}" -eq 1 ]; then
        output_dir="${IMAGE_OUTPUT_DIR_PCP[$img]}"
        echo "📊 $img PCP vs Golden Reference:"
        [ "$VERBOSE" = true ] && echo "  Comparing: example_data/pcp/golden_pcp_data vs $output_dir"
        python3 tests/compare_outputs.py example_data/pcp/golden_pcp_data "$output_dir" --name1 "Golden PCP" --name2 "$img"
        IMAGE_MATCH_PCP["$img"]=$?
        echo ""
    else
        echo "⚠️  Skipping $img PCP comparison - processing failed"
        IMAGE_MATCH_PCP["$img"]=1
    fi
done

# Final results
echo "🎯 Unified Processing Test Results:"
echo ""
all_success=1
for img in "${SELECTED_IMAGES[@]}"; do
    airr_ok=0
    pcp_ok=0
    
    if [ "${IMAGE_SUCCESS_AIRR[$img]}" -eq 1 ] && [ "${IMAGE_MATCH_AIRR[$img]}" -eq 0 ]; then
        airr_ok=1
    fi
    
    if [ "${IMAGE_SUCCESS_PCP[$img]}" -eq 1 ] && [ "${IMAGE_MATCH_PCP[$img]}" -eq 0 ]; then
        pcp_ok=1
    fi
    
    if [ $airr_ok -eq 1 ] && [ $pcp_ok -eq 1 ]; then
        echo "  ✅ $img: Both AIRR and PCP auto-detection work correctly"
    else
        echo "  ❌ $img: Issues detected"
        all_success=0
        if [ $airr_ok -eq 0 ]; then
            echo "     - AIRR auto-detection failed"
            if [ "${IMAGE_SUCCESS_AIRR[$img]}" -eq 0 ]; then
                echo "       Debug with: sudo docker run --rm -v \$(pwd)/example_data:/data $img python bin/process_data.py -i /data/airr/full_schema_dataset.json -o /output --validate --seed 42 -v"
            fi
        fi
        if [ $pcp_ok -eq 0 ]; then
            echo "     - PCP auto-detection failed"
            if [ "${IMAGE_SUCCESS_PCP[$img]}" -eq 0 ]; then
                echo "       Debug with: sudo docker run --rm -v \$(pwd)/example_data:/data $img python bin/process_data.py -i /data/pcp/test_pcp_data.csv -o /output --validate --seed 42 -v"
            fi
        fi
    fi
done

echo ""
if [ $all_success -eq 1 ]; then
    echo "🎉 SUCCESS: Unified process_data.py auto-detection works perfectly!"
    echo "✅ Both AIRR JSON and PCP CSV formats are correctly detected and processed"
else
    echo "❌ FAILURE: Some auto-detection tests failed"
fi