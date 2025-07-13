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
        print(f'❌ Different files found:')
        print(f'   {name1} has {len(files1)} files')
        print(f'   {name2} has {len(files2)} files')
        if files1 - files2:
            print(f'   Only in {name1}: {files1 - files2}')
        if files2 - files1:
            print(f'   Only in {name2}: {files2 - files1}')
        return False

    print(f'✅ Both versions produced {len(files1)} files')
    print()

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

print('Comparing Python 2.7 vs Python 3 output:')
match = compare_dirs('tests/output_py2', 'tests/output_py3', 'Python 2.7', 'Python 3')

print()
if match:
    print('🎉 SUCCESS: Python 3 produces identical output to Python 2.7!')
    print('✅ Migration verified - the data processing is fully compatible')
else:
    print('❌ FAILURE: Python 3 output differs from Python 2.7')
    print('⚠️  Migration needs review')
"
else
    echo "❌ Cannot compare - one or both containers failed"
    echo ""
    if [ $PY2_SUCCESS -eq 0 ]; then
        echo "Debug Python 2.7 container with:"
        echo "sudo docker run --rm -v \$(pwd)/example_data:/data olmsted:python2 python bin/process_data.py -i /data/full_schema_dataset.json -o /output -v"
    fi
fi
