#!/bin/bash

echo "🧪 Olmsted Docker Image Test Suite - Data Processing"
echo "===================================================="

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <docker-image-1> [docker-image-2] ..."
    echo ""
    echo "This script runs both AIRR and PCP data processing tests."
    echo ""
    echo "Examples:"
    echo "  $0 olmsted:python3"
    echo "  $0 olmsted:python3 olmsted:node18"
    echo ""
    exit 1
fi

# Change to project root if running from tests directory
if [[ $(basename "$PWD") == "tests" ]]; then
    cd ..
fi

echo "PWD: $PWD"
echo ""

# Store images to test
IMAGES=("$@")

echo "📋 Testing images:"
for img in "${IMAGES[@]}"; do
    echo "  - $img"
done
echo ""

# Initialize overall results
declare -A AIRR_SUCCESS
declare -A PCP_SUCCESS
overall_success=1

echo "=========================================="
echo "🔬 Running AIRR Data Processing Tests"
echo "=========================================="
echo ""

# Run AIRR tests
./tests/test_docker_process_data.sh "${IMAGES[@]}"
airr_exit_code=$?

# Parse AIRR results by checking if output directories contain expected files
for img in "${IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    output_dir="tests/_output_${output_name}"
    
    if [ -d "$output_dir" ] && [ -f "$output_dir/datasets.json" ] && ls "$output_dir"/clones.*.json >/dev/null 2>&1 && ls "$output_dir"/tree.*.json >/dev/null 2>&1; then
        AIRR_SUCCESS["$img"]=1
        echo "📝 AIRR test result for $img: ✅ PASSED"
    else
        AIRR_SUCCESS["$img"]=0
        echo "📝 AIRR test result for $img: ❌ FAILED"
        overall_success=0
    fi
done

echo ""
echo "=========================================="
echo "🧬 Running PCP Data Processing Tests"
echo "=========================================="
echo ""

# Run PCP tests
./tests/test_docker_process_pcp.sh "${IMAGES[@]}"
pcp_exit_code=$?

# Parse PCP results by checking if output directories contain expected files
for img in "${IMAGES[@]}"; do
    output_name=$(echo "$img" | sed 's/:/_/g' | sed 's/olmsted_//')
    output_dir="tests/_output_pcp_${output_name}"
    
    if [ -d "$output_dir" ] && [ -f "$output_dir/datasets.json" ] && ls "$output_dir"/clones.*.json >/dev/null 2>&1 && ls "$output_dir"/tree.*.json >/dev/null 2>&1; then
        PCP_SUCCESS["$img"]=1
        echo "📝 PCP test result for $img: ✅ PASSED"
    else
        PCP_SUCCESS["$img"]=0
        echo "📝 PCP test result for $img: ❌ FAILED"
        overall_success=0
    fi
done

echo ""
echo "=========================================="
echo "📊 FINAL TEST SUITE RESULTS"
echo "=========================================="
echo ""

# Print detailed results
for img in "${IMAGES[@]}"; do
    airr_status="❌ FAILED"
    pcp_status="❌ FAILED"
    
    if [ "${AIRR_SUCCESS[$img]}" -eq 1 ]; then
        airr_status="✅ PASSED"
    fi
    
    if [ "${PCP_SUCCESS[$img]}" -eq 1 ]; then
        pcp_status="✅ PASSED"
    fi
    
    echo "🐳 $img:"
    echo "  📁 AIRR Processing: $airr_status"
    echo "  🧬 PCP Processing:  $pcp_status"
    echo ""
done

# Overall summary
if [ $overall_success -eq 1 ]; then
    echo "🎉 SUCCESS: All data processing tests passed!"
    echo "✅ Both AIRR and PCP data processing work correctly"
    exit 0
else
    echo "❌ FAILURE: Some data processing tests failed"
    echo "💡 Check individual test outputs above for details"
    exit 1
fi