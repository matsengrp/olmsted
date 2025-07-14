#!/usr/bin/env python3
import json
import os
import sys
import argparse

def normalize_json(obj):
    """Recursively sort dictionaries by key to enable comparison"""
    if isinstance(obj, dict):
        return {k: normalize_json(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [normalize_json(item) for item in obj]
    else:
        return obj

def compare_json_files(file1, file2):
    """Compare two JSON files after normalizing"""
    with open(file1) as f:
        data1 = json.load(f)
    with open(file2) as f:
        data2 = json.load(f)
    
    norm1 = normalize_json(data1)
    norm2 = normalize_json(data2)
    
    return norm1 == norm2

def compare_dirs(dir1, dir2, name1="Dir1", name2="Dir2"):
    """Compare all JSON files in two directories"""
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

def main():
    parser = argparse.ArgumentParser(description='Compare JSON outputs from two directories')
    parser.add_argument('dir1', help='First directory to compare')
    parser.add_argument('dir2', help='Second directory to compare')
    parser.add_argument('--name1', default='Dir1', help='Name for first directory in output')
    parser.add_argument('--name2', default='Dir2', help='Name for second directory in output')
    
    args = parser.parse_args()
    
    # Change to project root if running from tests directory
    if os.path.basename(os.getcwd()) == 'tests':
        os.chdir('..')
    
    print(f'Comparing {args.name1} vs {args.name2}:')
    match = compare_dirs(args.dir1, args.dir2, args.name1, args.name2)
    
    print()
    if match:
        print('🎉 SUCCESS: All outputs match!')
        return 0
    else:
        print('❌ FAILURE: Outputs differ')
        return 1

if __name__ == "__main__":
    sys.exit(main())