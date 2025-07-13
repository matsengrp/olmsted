# Olmsted Python 3 Migration Tests

This directory contains test scripts to verify the Python 3 migration.

## Test Scripts

### test_py3_containers.sh
Comprehensive test that:
- Runs local Python 3 script
- Runs Python 2.7 full container
- Runs Python 3 full container
- Compares all outputs to ensure they're identical
- Compares with reference output in `example_data/build_data/`

### compare_outputs.py
Python script that compares JSON outputs after normalizing field order.

## Running Tests

Or from within the tests directory:
```bash
cd tests
bash test_py3_containers.sh
```

## Test Output Structure

All test outputs are stored in subdirectories:
- `tests/output_local/` - Local Python 3 script output
- `tests/output_py3_full/` - Full container output
- `tests/output_py3_data/` - Data-only container output

## Expected Results

All three methods should produce identical outputs:
- 11 JSON files total
- 1 datasets.json
- 1 clones file
- 9 tree files

The content should match the reference data in `example_data/build_data/` (field ordering may differ).
