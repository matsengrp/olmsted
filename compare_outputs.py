#!/usr/bin/env python3
import json
import os
import sys

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

def main():
    old_dir = 'example_data/build_data'
    new_dir = 'test_output_py3'
    
    # Get all files
    old_files = sorted(os.listdir(old_dir))
    new_files = sorted(os.listdir(new_dir))
    
    print(f"Files in old output: {len(old_files)}")
    print(f"Files in new output: {len(new_files)}")
    print()
    
    all_match = True
    
    for fname in old_files:
        if fname.endswith('.json'):
            if fname in new_files:
                match = compare_json_files(
                    os.path.join(old_dir, fname),
                    os.path.join(new_dir, fname)
                )
                status = "MATCH" if match else "MISMATCH"
                print(f"{fname}: {status}")
                if not match:
                    all_match = False
            else:
                print(f"{fname}: NOT FOUND in new output")
                all_match = False
    
    print()
    print(f"All files match: {all_match}")
    
    return 0 if all_match else 1

if __name__ == "__main__":
    sys.exit(main())