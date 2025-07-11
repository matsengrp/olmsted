#!/bin/bash

echo "🧪 Python 3 Docker Containers Comparison Test"
echo "=================================================="

# Clean up any existing test directories
rm -rf test_output_py3_full test_output_py3_data

# Create output directories
mkdir -p test_output_py3_full test_output_py3_data

echo "🐍 Testing Python 3 full container (olmsted:python3)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/test_output_py3_full:/output \
    olmsted:python3 \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output

if [ $? -eq 0 ]; then
    echo "✅ Python 3 full container completed successfully"
    PY3_FULL_SUCCESS=1
else
    echo "❌ Python 3 full container failed"
    PY3_FULL_SUCCESS=0
fi

echo ""
echo "🐍 Testing Python 3 data-only container (olmsted:python3-dataonly)..."
sudo docker run --rm \
    -v $(pwd)/example_data:/data \
    -v $(pwd)/test_output_py3_data:/output \
    olmsted:python3-dataonly \
    python bin/process_data.py -i /data/full_schema_dataset.json -o /output

if [ $? -eq 0 ]; then
    echo "✅ Python 3 data-only container completed successfully"
    PY3_DATA_SUCCESS=1
else
    echo "❌ Python 3 data-only container failed"
    PY3_DATA_SUCCESS=0
fi

echo ""
echo "📊 File counts:"
echo "Local Python 3 output: $(ls test_output_py3/*.json 2>/dev/null | wc -l) files"
echo "Python 3 full container: $(ls test_output_py3_full/*.json 2>/dev/null | wc -l) files"
echo "Python 3 data-only container: $(ls test_output_py3_data/*.json 2>/dev/null | wc -l) files"

echo ""
echo "🔍 Comparing outputs..."

if [ $PY3_FULL_SUCCESS -eq 1 ] && [ $PY3_DATA_SUCCESS -eq 1 ]; then
    echo "Comparing Python 3 full vs data-only containers:"
    python3 -c "
import json, os

def normalize_json(obj):
    if isinstance(obj, dict):
        return {k: normalize_json(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [normalize_json(item) for item in obj]
    else:
        return obj

def compare_dirs(dir1, dir2, name1, name2):
    files1 = set(f for f in os.listdir(dir1) if f.endswith('.json'))
    files2 = set(f for f in os.listdir(dir2) if f.endswith('.json'))
    
    if files1 != files2:
        print(f'Different files: {name1}={len(files1)}, {name2}={len(files2)}')
        return False
    
    all_match = True
    for fname in sorted(files1):
        with open(os.path.join(dir1, fname)) as f1, open(os.path.join(dir2, fname)) as f2:
            data1, data2 = json.load(f1), json.load(f2)
            if normalize_json(data1) == normalize_json(data2):
                print(f'  ✅ {fname}: MATCH')
            else:
                print(f'  ❌ {fname}: MISMATCH')
                all_match = False
    return all_match

match = compare_dirs('test_output_py3_full', 'test_output_py3_data', 'full', 'data-only')
print(f'\nContainers produce identical output: {match}')
"
fi

echo ""
echo "Comparing with local Python 3 output:"
if [ -d "test_output_py3" ] && [ $PY3_DATA_SUCCESS -eq 1 ]; then
    python3 -c "
import json, os

def normalize_json(obj):
    if isinstance(obj, dict):
        return {k: normalize_json(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [normalize_json(item) for item in obj]
    else:
        return obj

def compare_dirs(dir1, dir2, name1, name2):
    files1 = set(f for f in os.listdir(dir1) if f.endswith('.json'))
    files2 = set(f for f in os.listdir(dir2) if f.endswith('.json'))
    
    if files1 != files2:
        print(f'Different files: {name1}={len(files1)}, {name2}={len(files2)}')
        return False
    
    all_match = True
    for fname in sorted(files1):
        with open(os.path.join(dir1, fname)) as f1, open(os.path.join(dir2, fname)) as f2:
            data1, data2 = json.load(f1), json.load(f2)
            if normalize_json(data1) == normalize_json(data2):
                print(f'  ✅ {fname}: MATCH')
            else:
                print(f'  ❌ {fname}: MISMATCH')
                all_match = False
    return all_match

match = compare_dirs('test_output_py3', 'test_output_py3_data', 'local', 'container')
print(f'\nLocal vs Container output identical: {match}')
"
else
    echo "❌ Cannot compare - missing local output or container failed"
fi