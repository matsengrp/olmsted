#!/bin/bash

# Generate performance test datasets of various sizes
# Can be sourced to use generate_dataset function independently

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values (can be overridden when sourcing)
TEST_DIR="${TEST_DIR:-_test_data}"
GENERATE_SCRIPT="${GENERATE_SCRIPT:-python3 generate_raw_test_data.py}"

# Function to generate and process dataset
# Usage: generate_test_dataset <clones> <name> <output_dir> [evolution_rate] [description]
generate_test_dataset() {
    local clones=$1
    local name=$2
    local output_dir=$3
    local evolution_rate=${4:-0.05}
    local description="${5:-Test dataset with $clones clones (evolution rate: $evolution_rate)}"

    echo -e "\n${BLUE}Generating: ${description}${NC}"
    echo "  Clones: $clones"
    echo "  Evolution rate: $evolution_rate"
    echo "  Output dir: $output_dir"
    echo "  Target file: ${output_dir}/${name}.json"

    # Create output directory
    mkdir -p "$output_dir"

    # Generate the test data
    $GENERATE_SCRIPT \
        --clones $clones \
        --name "$name" \
        --evolution-rate $evolution_rate \
        --output "${output_dir}/${name}_raw.json"

    if [ ! -f "${output_dir}/${name}_raw.json" ]; then
        echo -e "  ${YELLOW}❌ Failed to generate raw data${NC}"
        return 1
    fi

    # Process with olmsted CLI to ensure it's valid
    echo "  Processing with olmsted CLI..."
    olmsted process -v \
        -i "${output_dir}/${name}_raw.json" \
        -o "${output_dir}/${name}.json" \
        --name "$name"

    # Get file size
    if [ -f "${output_dir}/${name}.json" ]; then
        SIZE=$(du -h "${output_dir}/${name}.json" | cut -f1)
        echo -e "  ${GREEN}✅ Generated: ${SIZE}${NC}"
        # Clean up raw file
        rm -f "${output_dir}/${name}_raw.json"
    else
        echo -e "  ${YELLOW}❌ Failed to process with olmsted CLI${NC}"
        echo "  Raw file available at: ${output_dir}/${name}_raw.json"
    fi
}

# Main execution - only runs when script is executed directly (not sourced)
main() {
    echo "🚀 Generating Olmsted Performance Test Datasets"
    echo "=============================================="

    # Create test data directory
    mkdir -p $TEST_DIR

    # Check if olmsted is installed
    if ! command -v olmsted &> /dev/null; then
        echo -e "${YELLOW}⚠️  olmsted CLI not found. Please install it first:${NC}"
        echo "   pip install -e olmsted-cli/"
        exit 1
    fi

    # Generate test datasets of different sizes
    echo -e "\n${BLUE}Test Suite 1: Performance Targets${NC}"

# Tiny dataset for debugging
generate_test_dataset 5 "perf_test_tiny" "$TEST_DIR" 0.05 "Small dataset (1 clones)"

# Small dataset for quick testing
generate_test_dataset 100 "perf_test_small" "$TEST_DIR" 0.05 "Small dataset (100 clones)"

# Medium dataset - target for good performance
generate_test_dataset 1000 "perf_test_medium" "$TEST_DIR" 0.05 "Medium dataset (1000 clones) - PRIMARY TARGET"

# Large dataset - stress test
generate_test_dataset 5000 "perf_test_large" "$TEST_DIR" 0.05 "Large dataset (5000 clones)"

# Extra large - edge case
# generate_test_dataset 10000 "perf_test_xlarge" "$TEST_DIR" 0.05 "Extra large dataset (10000 clones)"

# Summary
echo -e "\n${GREEN}📊 Test Data Generation Complete!${NC}"
echo "================================="
echo "Generated files in ${TEST_DIR}/:"
if ls ${TEST_DIR}/*.json 1> /dev/null 2>&1; then
    ls -lh ${TEST_DIR}/*.json | grep -v "_raw" | awk '{print "  " $9 ": " $5}'
else
    echo "  No files generated successfully"
fi

echo -e "\n${BLUE}📈 Performance Testing Instructions:${NC}"
echo "1. Start the webapp:"
echo "   cd ../../ && npm start"
echo ""
echo "2. Run the performance test runner:"
echo "   npm run test:perf:serve"
echo "   # Opens http://localhost:8080"
echo ""
echo "3. Or upload test file manually and use console:"
echo "   - Upload ${TEST_DIR}/perf_test_medium.json through webapp UI"
echo "   - Open browser console (F12)"
echo "   - Run: const tester = new OlmstedPerformanceTester();"
echo "   - Run: await tester.runAllTests();"
echo ""
echo "Performance Targets:"
echo "  ✅ Initial load: < 2 seconds for 10MB datasets"
echo "  ✅ Tree switching: < 100ms (from memory)"
echo "  ✅ Table scrolling: Smooth with 1000+ rows"

    # Cleanup any temporary files
    if [ -f "generate_raw_test_data.py" ] && [ ! -f "../../olmsted-cli/olmsted_cli/generate_raw_test_data.py" ]; then
        echo -e "\n${BLUE}Note: Created temporary generate_raw_test_data.py${NC}"
        echo "You can delete it or move it to a permanent location if needed."
    fi
}

# Only run main function if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
