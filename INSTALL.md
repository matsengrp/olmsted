# Olmsted Installation Guide

This guide provides detailed instructions for installing and running Olmsted, a tool for visualizing and exploring B cell lineages.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Installation Methods](#installation-methods)
  - [Method 1: Using Docker (Recommended)](#method-1-using-docker-recommended)
  - [Method 2: Manual Installation](#method-2-manual-installation)
- [Python Version Support](#python-version-support)
- [Verifying Your Installation](#verifying-your-installation)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### For Docker Installation
- Docker installed on your system ([Get Docker](https://docs.docker.com/get-docker/))
- Git for cloning the repository

### For Manual Installation
- Python 3.9+ (see [Python Version Support](#python-version-support))
- Node.js 12.x and npm
- Git for cloning the repository

## Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/matsengrp/olmsted.git
cd olmsted
git submodule update --init

# Process example data
cd example_data/
../bin/convert-airr-data.sh full_schema_dataset.json

# Start the server
cd build_data/
../../bin/olmsted-server.sh latest
```

Navigate to `http://localhost:3999` in your browser.

## Installation Methods

### Method 1: Using Docker (Recommended)

#### Step 1: Clone the Repository
```bash
git clone https://github.com/matsengrp/olmsted.git
cd olmsted
git submodule update --init
```

#### Step 2: Build or Pull the Docker Image

**Option A: Use Pre-built Image**
```bash
docker pull quay.io/matsengrp/olmsted:latest
```

**Option B: Build from Source**
```bash
# For full application with frontend
docker build -f Dockerfile -t olmsted:latest .
```

#### Step 3: Process Your Data
```bash
# Using the Docker container
docker run --rm -v $(pwd):/data olmsted:latest \
  python bin/process_data.py -i /data/example_data/full_schema_dataset.json \
  -o /data/example_data/build_data -n inferred_naive
```

#### Step 4: Run the Server
```bash
# From the build_data directory
docker run -p 3999:3999 -v $(pwd):/data olmsted:latest \
  npm start localData /data
```

### Method 2: Manual Installation

#### Step 1: Clone the Repository
```bash
git clone https://github.com/matsengrp/olmsted.git
cd olmsted
git submodule update --init
```

#### Step 2: Install Python Dependencies
```bash
# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements_py3.txt
```

#### Step 3: Install Node.js Dependencies
```bash
# Install Node.js 12.x if not already installed
# See: https://nodejs.org/en/download/

# Install npm packages
npm install --legacy-peer-deps
```

#### Step 4: Install System Dependencies (if needed)
For Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

For macOS:
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

#### Step 5: Process Your Data
```bash
python bin/process_data.py -i example_data/full_schema_dataset.json \
  -o example_data/build_data -n inferred_naive
```

#### Step 6: Run the Server
```bash
npm start localData example_data/build_data 3999
```

## Python Version Support

Olmsted supports both Python 2.7 (legacy) and Python 3.10+:

- **Python 3.9+** (Recommended): Use `requirements_py3.txt` and `Dockerfile.python3`
- **Python 2.7** (Legacy): Use `requirements_py2.txt` and `Dockerfile.python2`

The data processing pipeline produces identical output in both versions.

## Verifying Your Installation

### Test Data Processing
```bash
# Process the example dataset
python bin/process_data.py -i example_data/full_schema_dataset.json -o test_output

# Compare with expected output
diff -r example_data/build_data/ test_output/
```

### Test Server
1. Start the server as described above
2. Navigate to `http://localhost:3999`
3. You should see the Olmsted logo and dataset list
4. Click `+` to add a dataset, then click "Explore!"

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Use a different port
docker run -p 8080:3999 olmsted:python3 npm start localData /data
```

**Permission Errors with Docker**
```bash
# Add sudo (Linux) or ensure Docker Desktop is running (macOS/Windows)
sudo docker run ...
```

**Node.js Canvas Errors**
- Ensure system dependencies for canvas are installed (see Step 4 in Manual Installation)
- Use `--legacy-peer-deps` when running npm install

**Python Import Errors**
- Ensure you're using the correct Python version
- Check that all dependencies from requirements_py3.txt are installed
- Verify the `ntpl` package is installed: `pip install ntpl`

### Getting Help

- Check the [README](README.md) for usage instructions
- Report issues at [GitHub Issues](https://github.com/matsengrp/olmsted/issues)
- Consult the [AIRR Community docs](https://docs.airr-community.org/) for data format questions

## Additional Resources

- [Olmsted Documentation](http://olmstedviz.org)
- [AIRR Data Schema](http://www.olmstedviz.org/schema.html)
- [Example Datasets](example_data/)
