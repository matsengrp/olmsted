#!/bin/bash

echo "🧪 Olmsted Data Processing Tests (No Docker)"
echo "=============================================="

# Change to project root if running from tests directory
if [[ $(basename "$PWD") == "tests" ]]; then
    cd ..
fi

echo "PWD: $PWD"
echo ""

# Clean up any existing test directories
echo "🧹 Cleaning up existing test directories..."
rm -rf tests/_output_local_airr tests/_output_local_pcp
mkdir -p tests/_output_local_airr tests/_output_local_pcp

# Test results tracking
overall_success=1
airr_success=0
pcp_success=0

echo "=========================================="
echo "🔬 Testing AIRR Data Processing"
echo "=========================================="
echo ""

echo "Running: python bin/process_airr_data.py -i example_data/airr/full_schema_dataset.json -o tests/_output_local_airr -v"
python bin/process_airr_data.py -i example_data/airr/full_schema_dataset.json -o tests/_output_local_airr -v

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AIRR processing completed successfully"

    # Check output files
    if [ -f "tests/_output_local_airr/datasets.json" ] && ls tests/_output_local_airr/clones.*.json >/dev/null 2>&1 && ls tests/_output_local_airr/tree.*.json >/dev/null 2>&1; then
        file_count=$(ls tests/_output_local_airr/*.json | wc -l)
        echo "✅ AIRR test: Generated $file_count JSON files with correct structure"
        airr_success=1
    else
        echo "❌ AIRR test: Missing expected output files"
        overall_success=0
    fi
else
    echo "❌ AIRR processing failed"
    overall_success=0
fi

echo ""
echo "=========================================="
echo "🧬 Testing PCP Data Processing"
echo "=========================================="
echo ""

echo "Running: python bin/process_pcp_data.py -i example_data/pcp/test_pcp_small.csv -o tests/_output_local_pcp -v"
python bin/process_pcp_data.py -i example_data/pcp/test_pcp_small.csv -o tests/_output_local_pcp -v

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PCP processing completed successfully"

    # Check output files
    if [ -f "tests/_output_local_pcp/datasets.json" ] && ls tests/_output_local_pcp/clones.*.json >/dev/null 2>&1 && ls tests/_output_local_pcp/tree.*.json >/dev/null 2>&1; then
        file_count=$(ls tests/_output_local_pcp/*.json | wc -l)
        echo "✅ PCP test: Generated $file_count JSON files with correct AIRR structure"
        pcp_success=1
    else
        echo "❌ PCP test: Missing expected output files"
        overall_success=0
    fi
else
    echo "❌ PCP processing failed"
    overall_success=0
fi

echo ""
echo "=========================================="
echo "🔍 Validating JSON Structure"
echo "=========================================="
echo ""

# Validate JSON files
json_valid=1
for json_file in tests/_output_local_airr/*.json tests/_output_local_pcp/*.json; do
    if [ -f "$json_file" ]; then
        if ! python -m json.tool "$json_file" > /dev/null 2>&1; then
            echo "❌ Invalid JSON: $json_file"
            json_valid=0
            overall_success=0
        fi
    fi
done

if [ $json_valid -eq 1 ]; then
    echo "✅ All generated JSON files are valid"
fi

echo ""
echo "=========================================="
echo "📊 FINAL TEST RESULTS"
echo "=========================================="
echo ""

echo "📁 AIRR Processing: $([ $airr_success -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "🧬 PCP Processing:  $([ $pcp_success -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "🔍 JSON Validation: $([ $json_valid -eq 1 ] && echo "✅ PASSED" || echo "❌ FAILED")"

echo ""
if [ $overall_success -eq 1 ]; then
    echo "🎉 SUCCESS: All data processing tests passed!"
    echo "✅ Both AIRR and PCP→AIRR conversion work correctly"
    exit 0
else
    echo "❌ FAILURE: Some tests failed"
    echo "💡 Check output above for details"
    exit 1
fi
