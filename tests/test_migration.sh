#!/bin/bash

echo "🧪 Python 2 to Python 3 Migration Test"
echo "=================================================="

# Change to project root if running from tests directory
if [[ $(basename "$PWD") == "tests" ]]; then
    cd ..
fi
echo "PWD: $PWD"

# Clean up any existing test directories
rm -rf tests/output_py2 tests/output_py3

# Create output directories
mkdir -p tests/output_py2 tests/output_py3

echo "🐍 Testing Python 2.7 container (olmsted:python2)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/tests/output_py2:/output \
    olmsted:python2 \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output \
    -v

if [ $? -eq 0 ]; then
    echo "✅ Python 2.7 container completed successfully"
    PY2_SUCCESS=1
else
    echo "❌ Python 2.7 container failed"
    PY2_SUCCESS=0
fi

echo ""
echo "🐍 Testing Python 3 container (olmsted:python3)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/tests/output_py3:/output \
    olmsted:python3 \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output \
    -v

if [ $? -eq 0 ]; then
    echo "✅ Python 3 container completed successfully"
    PY3_SUCCESS=1
else
    echo "❌ Python 3 container failed"
    PY3_SUCCESS=0
fi

echo ""
echo "📊 File counts:"
echo "Python 2.7 output: $(ls tests/output_py2/*.json 2>/dev/null | wc -l) files"
echo "Python 3 output: $(ls tests/output_py3/*.json 2>/dev/null | wc -l) files"

echo ""
echo "🔍 Comparing outputs against golden reference..."

# Compare Python 2.7 output against golden reference
if [ $PY2_SUCCESS -eq 1 ]; then
    echo "📊 Python 2.7 vs Golden Reference:"
    python3 tests/compare_outputs.py example_data/build_data tests/output_py2 --name1 "Golden Reference" --name2 "Python 2.7"
    PY2_MATCH=$?
    echo ""
else
    echo "⚠️  Skipping Python 2.7 comparison - container failed"
    PY2_MATCH=1
fi

# Compare Python 3 output against golden reference
if [ $PY3_SUCCESS -eq 1 ]; then
    echo "📊 Python 3 vs Golden Reference:"
    python3 tests/compare_outputs.py example_data/build_data tests/output_py3 --name1 "Golden Reference" --name2 "Python 3"
    PY3_MATCH=$?
    echo ""
else
    echo "⚠️  Skipping Python 3 comparison - container failed"
    PY3_MATCH=1
fi

# Final results
echo "🎯 Migration Test Results:"
if [ $PY2_SUCCESS -eq 1 ] && [ $PY2_MATCH -eq 0 ]; then
    echo "  ✅ Python 2.7: Container runs and output matches golden reference"
else
    echo "  ❌ Python 2.7: Failed"
fi

if [ $PY3_SUCCESS -eq 1 ] && [ $PY3_MATCH -eq 0 ]; then
    echo "  ✅ Python 3: Container runs and output matches golden reference"
else
    echo "  ❌ Python 3: Failed"
fi

echo ""
if [ $PY3_SUCCESS -eq 1 ] && [ $PY3_MATCH -eq 0 ]; then
    echo "🎉 SUCCESS: Python 3 migration is verified!"
    echo "✅ Python 3 produces identical output to the golden reference"
else
    echo "❌ FAILURE: Python 3 migration needs review"
    if [ $PY3_SUCCESS -eq 0 ]; then
        echo "Debug Python 3 container with:"
        echo "sudo docker run --rm -v \$(pwd)/example_data:/data olmsted:python3 python bin/process_data.py -i /data/full_schema_dataset.json -o /output -v"
    fi
fi
