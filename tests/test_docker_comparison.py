#!/usr/bin/env python3
"""
Test script to compare outputs from different Docker containers
"""
import json
import os
import subprocess
import sys
import tempfile
import shutil

def normalize_json(obj):
    """Recursively sort dictionaries by key to enable comparison"""
    if isinstance(obj, dict):
        return {k: normalize_json(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [normalize_json(item) for item in obj]
    else:
        return obj

def run_docker_container(image_name, input_file, output_dir):
    """Run a Docker container and process data"""
    print(f"Running {image_name}...")
    
    # Create absolute paths
    current_dir = os.getcwd()
    input_path = os.path.join(current_dir, input_file)
    output_path = os.path.join(current_dir, output_dir)
    
    # Create output directory
    os.makedirs(output_path, exist_ok=True)
    
    if image_name == "olmsted:old":
        # Python 2.7 version uses the original script location
        cmd = [
            "sudo", "docker", "run", "--rm",
            "-v", f"{current_dir}/example_data:/data",
            "-v", f"{output_path}:/output",
            image_name,
            "python", "bin/process_data.py",
            "-i", "/data/full_schema_dataset.json",
            "-o", "/output"
        ]
    else:
        # Python 3 versions
        cmd = [
            "sudo", "docker", "run", "--rm",
            "-v", f"{current_dir}/example_data:/data",
            "-v", f"{output_path}:/output",
            image_name,
            "python", "bin/process_data.py",
            "-i", "/data/full_schema_dataset.json",
            "-o", "/output"
        ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"Error running {image_name}:")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False
        print(f"✅ {image_name} completed successfully")
        return True
    except subprocess.TimeoutExpired:
        print(f"❌ {image_name} timed out")
        return False
    except Exception as e:
        print(f"❌ {image_name} failed: {e}")
        return False

def compare_directories(dir1, dir2, name1, name2):
    """Compare two output directories"""
    print(f"\nComparing {name1} vs {name2}:")
    
    files1 = set(f for f in os.listdir(dir1) if f.endswith('.json'))
    files2 = set(f for f in os.listdir(dir2) if f.endswith('.json'))
    
    if files1 != files2:
        print(f"❌ Different files found:")
        print(f"  {name1} only: {files1 - files2}")
        print(f"  {name2} only: {files2 - files1}")
        return False
    
    all_match = True
    for filename in sorted(files1):
        file1 = os.path.join(dir1, filename)
        file2 = os.path.join(dir2, filename)
        
        try:
            with open(file1) as f:
                data1 = json.load(f)
            with open(file2) as f:
                data2 = json.load(f)
            
            norm1 = normalize_json(data1)
            norm2 = normalize_json(data2)
            
            if norm1 == norm2:
                print(f"  ✅ {filename}: MATCH")
            else:
                print(f"  ❌ {filename}: MISMATCH")
                all_match = False
        except Exception as e:
            print(f"  ❌ {filename}: ERROR - {e}")
            all_match = False
    
    return all_match

def main():
    print("🧪 Docker Container Comparison Test")
    print("=" * 50)
    
    # Clean up any existing test output directories
    test_dirs = ["test_output_old", "test_output_py3", "test_output_py3_dataonly"]
    for test_dir in test_dirs:
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
    
    # Test configurations
    containers = [
        ("olmsted:old", "test_output_old"),
        ("olmsted:python3", "test_output_py3"),
        ("olmsted:python3-dataonly", "test_output_py3_dataonly")
    ]
    
    # Run all containers
    successful_runs = []
    for image, output_dir in containers:
        if run_docker_container(image, "example_data/full_schema_dataset.json", output_dir):
            successful_runs.append((image, output_dir))
        else:
            print(f"❌ Skipping {image} due to execution failure")
    
    if len(successful_runs) < 2:
        print("\n❌ Need at least 2 successful runs for comparison")
        return 1
    
    print(f"\n🔍 Comparing outputs from {len(successful_runs)} containers...")
    
    # Compare all successful runs against the first one (reference)
    reference_name, reference_dir = successful_runs[0]
    all_comparisons_match = True
    
    for i in range(1, len(successful_runs)):
        test_name, test_dir = successful_runs[i]
        match = compare_directories(reference_dir, test_dir, reference_name, test_name)
        if not match:
            all_comparisons_match = False
    
    print("\n" + "=" * 50)
    if all_comparisons_match:
        print("🎉 ALL CONTAINERS PRODUCE IDENTICAL OUTPUT!")
        print("✅ Python 3 migration successful - outputs match Python 2.7")
    else:
        print("❌ CONTAINERS PRODUCE DIFFERENT OUTPUTS")
        print("⚠️  Migration needs review")
    
    return 0 if all_comparisons_match else 1

if __name__ == "__main__":
    sys.exit(main())