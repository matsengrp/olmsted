# Olmsted Test Suite

This directory contains various tests for the Olmsted data processing pipeline.

## Test Scripts

### Local Tests (No Docker Required)

#### `test_process_data.sh`
Tests both AIRR and PCP data processing locally without Docker.
- Uses full AIRR dataset (`example_data/airr/full_schema_dataset.json`)
- Uses small PCP dataset (`example_data/pcp/test_pcp_small.csv` - 100 rows)
- Quick to run for development testing

```bash
./tests/test_process_data.sh
```

### Docker Tests

#### `test_docker_process_airr.sh`
Tests AIRR data processing in Docker containers.
- Tests the original renamed script (was `test_docker_process_data.sh`)
- Uses full AIRR dataset
- Compares output against golden reference data

```bash
./tests/test_docker_process_airr.sh olmsted:python3
```

#### `test_docker_process_pcp.sh`
Tests PCP data processing in Docker containers.
- Uses full PCP dataset (compressed)
- Validates AIRR format output structure

```bash
./tests/test_docker_process_pcp.sh olmsted:python3
```

#### `test_docker_process_pcp_fast.sh` ⚡
Fast version of PCP Docker tests.
- Uses small PCP dataset (100 rows) for quick testing
- Ideal for CI/CD pipelines

```bash
./tests/test_docker_process_pcp_fast.sh olmsted:python3
```

#### `test_docker_process_data.sh`
Combined test suite that runs both AIRR and PCP tests.
- Runs both `test_docker_process_airr.sh` and `test_docker_process_pcp.sh`
- Provides comprehensive test coverage

```bash
./tests/test_docker_process_data.sh olmsted:python3 olmsted:node18
```

### Other Tests

#### `test_docker_image.sh`
Basic Docker image functionality test.

#### `test_docker_server.sh`
Tests the Olmsted server in Docker.

#### `compare_outputs.py`
Python utility for comparing JSON outputs between different runs.

## Test Data

### AIRR Test Data
- Full dataset: `example_data/airr/full_schema_dataset.json`
- Golden reference: `example_data/airr/golden_airr_data/`

### PCP Test Data
- Full dataset: `example_data/pcp/ford-flairr-seq-prod-UnmutInv_igh_pcp_2024-07-26.csv.gz` (compressed)
- Small dataset: `example_data/pcp/test_pcp_small.csv` (100 rows for fast testing)
- Trees dataset: `example_data/pcp/ford-flairr-seq-prod-UnmutInv_igh_trees_2024-07-26.csv.gz`

## Running Tests

### Quick Development Test
```bash
# Test locally without Docker (fastest)
./tests/test_process_data.sh

# Or test with Docker using small datasets
./tests/test_docker_process_pcp_fast.sh olmsted:python3
```

### Full Test Suite
```bash
# Test everything with Docker
./tests/test_docker_process_data.sh olmsted:python3
```

### Testing Multiple Docker Images
```bash
# Test Python 2 vs Python 3 migration
./tests/test_docker_process_airr.sh olmsted:python2 olmsted:python3

# Test different Node versions
./tests/test_docker_process_data.sh olmsted:python3 olmsted:node18
```

## Expected Output

All tests should produce:
1. `datasets.json` - Main dataset file
2. `clones.*.json` - Clone data files
3. `tree.*.json` - Phylogenetic tree files

The output follows the AIRR Community format standards.

## Troubleshooting

If tests fail:
1. Check Docker is installed and running
2. Ensure you're in the project root or tests directory
3. Verify test data files exist
4. Check file permissions on test scripts

For debugging failed Docker tests, use the debug commands shown in test output.