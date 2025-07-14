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
echo "🔍 Comparing outputs..."

if [ $PY2_SUCCESS -eq 1 ] && [ $PY3_SUCCESS -eq 1 ]; then
    python3 tests/compare_outputs.py tests/output_py2 tests/output_py3 --name1 "Python 2.7" --name2 "Python 3"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migration verified - the data processing is fully compatible"
    else
        echo ""
        echo "⚠️  Migration needs review"
    fi
else
    echo "❌ Cannot compare - one or both containers failed"
    echo ""
    if [ $PY2_SUCCESS -eq 0 ]; then
        echo "Debug Python 2.7 container with:"
        echo "sudo docker run --rm -v \$(pwd)/example_data:/data olmsted:python2 python bin/process_data.py -i /data/full_schema_dataset.json -o /output -v"
    fi
fi
