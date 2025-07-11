#!/bin/bash

echo "🧪 Docker Container Comparison Test"
echo "=================================================="

# Clean up any existing test directories
rm -rf test_output_old test_output_py3 test_output_py3_dataonly

# Create output directories
mkdir -p test_output_old test_output_py3 test_output_py3_dataonly

echo "🐍 Testing Python 2.7 container (olmsted:old)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/test_output_old:/output \
    olmsted:old \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output

if [ $? -eq 0 ]; then
    echo "✅ Python 2.7 container completed successfully"
else
    echo "❌ Python 2.7 container failed"
    exit 1
fi

echo ""
echo "🐍 Testing Python 3 full container (olmsted:python3)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/test_output_py3:/output \
    olmsted:python3 \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output

if [ $? -eq 0 ]; then
    echo "✅ Python 3 full container completed successfully"
else
    echo "❌ Python 3 full container failed"
fi

echo ""
echo "🐍 Testing Python 3 data-only container (olmsted:python3-dataonly)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/test_output_py3_dataonly:/output \
    olmsted:python3-dataonly \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output

if [ $? -eq 0 ]; then
    echo "✅ Python 3 data-only container completed successfully"
else
    echo "❌ Python 3 data-only container failed"
fi

echo ""
echo "🔍 Comparing outputs..."
python3 compare_outputs.py

echo ""
echo "📊 File counts:"
echo "Python 2.7 output: $(ls test_output_old/*.json 2>/dev/null | wc -l) files"
echo "Python 3 full output: $(ls test_output_py3/*.json 2>/dev/null | wc -l) files"
echo "Python 3 data-only output: $(ls test_output_py3_dataonly/*.json 2>/dev/null | wc -l) files"