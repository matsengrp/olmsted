# Olmsted Testing Infrastructure

This directory contains testing tools and scripts for validating the Olmsted data processing pipeline, particularly for the Python 2 to Python 3 migration.

## Files Overview

### Scripts
- **`test_migration.sh`** - Main migration test script that validates Python 2 and Python 3 containers against golden reference data
- **`compare_outputs.py`** - Python utility for comparing JSON outputs between directories

### Test Data
- **Golden Reference**: `../example_data/build_data/` - Known good outputs used as comparison baseline

## Running Tests

### Migration Validation Test
Tests both Python 2 and Python 3 containers against the golden reference:

```bash
# From project root
./tests/test_migration.sh
```

**What it does:**
1. Runs Python 2.7 container on example data
2. Runs Python 3.10 container on example data
3. Compares both outputs against golden reference in `example_data/build_data/`
4. Reports success/failure for migration validation

## Test Requirements

### Docker Images
- `olmsted:python2` - Python 2.7 container
- `olmsted:python3` - Python 3.10 container

Build with:
```bash
docker build -f Dockerfile.python2 -t olmsted:python2 .
docker build -f Dockerfile -t olmsted:python3 .
```

## Test Data Expectations

### Input
- **File**: `example_data/full_schema_dataset.json`
- **Format**: AIRR-compliant JSON dataset

### Expected Outputs
Both Python versions should produce **11 JSON files**:
- `datasets.json`
- `clones.test-input-2020.01.30.json`
- 9 tree files: `tree.<uuid>.json`
