#!/bin/bash

echo "🧪 Olmsted Docker Image Data Processing & Server Test"
echo "===================================================="

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <docker-image> [options]"
    echo ""
    echo "Options:"
    echo "  --data-only        Only process data, don't start server"
    echo "  --server-only      Only start server (assumes data exists in build_data/)"
    echo "  --port PORT        Server port (default: 3999)"
    echo "  --timeout SECONDS  Server timeout in seconds (default: 30)"
    echo "  --input-data PATH  Input data file (default: example_data/full_schema_dataset.json)"
    echo ""
    echo "Examples:"
    echo "  $0 olmsted:latest                    # Process data and start server"
    echo "  $0 olmsted:latest --data-only        # Only process data"
    echo "  $0 olmsted:latest --server-only      # Only start server"
    echo "  $0 olmsted:latest --port 8080        # Use custom port"
    echo ""
    echo "Note: This script follows Olmsted conventions from bin/convert-airr-data.sh"
    echo "      and bin/olmsted-server.sh for consistent workflow."
    exit 1
fi

# Default values
DOCKER_IMAGE="$1"
shift

DATA_ONLY=false
SERVER_ONLY=false
PORT=3999
TIMEOUT=30
INPUT_DATA="example_data/full_schema_dataset.json"
VERBOSE=false

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        --server-only)
            SERVER_ONLY=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --input-data)
            INPUT_DATA="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Change to project root if running from tests directory
if [[ $(basename "$PWD") == "tests" ]]; then
    cd ..
fi

echo "🔧 Configuration:"
echo "  Docker Image: $DOCKER_IMAGE"
echo "  Input Data: $INPUT_DATA"
echo "  Port: $PORT"
echo "  Data Only: $DATA_ONLY"
echo "  Server Only: $SERVER_ONLY"
echo "  Working Directory: $PWD"
echo ""

# Validate input data file exists
if [ ! -f "$INPUT_DATA" ]; then
    echo "❌ Error: Input data file '$INPUT_DATA' not found"
    exit 1
fi

# Create output directory (following Olmsted convention of build_data/)
build_data_dir="build_data"
test_output_dir="tests/output_$(echo "$DOCKER_IMAGE" | sed 's/:/_/g' | sed 's/olmsted_//')"

# Clean up function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    if [ ! -z "$CONTAINER_ID" ]; then
        echo "Stopping container: $CONTAINER_ID"
        sudo docker stop "$CONTAINER_ID" >/dev/null 2>&1 || true
        sudo docker rm "$CONTAINER_ID" >/dev/null 2>&1 || true
    fi
}

# Set up signal handlers
trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# Step 1: Process Data (unless server-only mode)
if [ "$SERVER_ONLY" = false ]; then
    echo "📊 Step 1: Processing data with $DOCKER_IMAGE..."
    echo "Following Olmsted workflow from bin/convert-airr-data.sh"

    # Clean up existing output
    rm -rf "$build_data_dir" "$test_output_dir"
    mkdir -p "$test_output_dir"

    # Get input file basename for proper mounting
    input_basename=$(basename "$INPUT_DATA")
    input_dir=$(dirname "$INPUT_DATA")

    # Run data processing (following convert-airr-data.sh pattern)
    echo "Running: docker run --rm -v \$(pwd)/$input_dir:/data $DOCKER_IMAGE bin/process_data.py -i /data/$input_basename -o /data/build_data -n inferred_naive"

    sudo docker run --rm \
        -v "$(pwd)/$input_dir:/data" \
        "$DOCKER_IMAGE" \
        bin/process_data.py -i "/data/$input_basename" -o "/data/build_data" -n inferred_naive

    if [ $? -eq 0 ]; then
        echo "✅ Data processing completed successfully"

        # Check if build_data was created in the expected location
        if [ -d "$input_dir/build_data" ]; then
            echo "📁 Generated build_data/ directory:"
            ls -la "$input_dir/build_data"/*.json | awk '{print "  " $9 " (" $5 " bytes)"}'

            # Copy for testing comparison if needed
            cp -r "$input_dir/build_data" "$test_output_dir/" 2>/dev/null || true
        else
            echo "⚠️  build_data directory not found in expected location"
        fi

    else
        echo "❌ Data processing failed"
        exit 1
    fi
    echo ""
fi

# Step 2: Start Server (unless data-only mode)
if [ "$DATA_ONLY" = false ]; then
    echo "🚀 Step 2: Starting test server with $DOCKER_IMAGE..."
    echo "Following Olmsted workflow from bin/olmsted-server.sh"

    # Determine where build_data should be located
    input_dir=$(dirname "$INPUT_DATA")
    data_location="$input_dir/build_data"

    # Check if we have data to serve
    if [ ! -d "$data_location" ] || [ -z "$(ls -A "$data_location" 2>/dev/null)" ]; then
        echo "❌ Error: No data found in $data_location. Run data processing first."
        echo "Expected directory structure: $data_location/"
        exit 1
    fi

    echo "📁 Data directory contents ($data_location):"
    ls -la "$data_location"/ | awk '{print "  " $9 " (" $5 " bytes)"}'
    echo ""

    # Start server in background (following olmsted-server.sh pattern)
    echo "Starting server on port $PORT..."
    echo "Command: docker run --rm -d -p $PORT:3999 -v \$(pwd)/$data_location:/data $DOCKER_IMAGE npm start localData /data"

    CONTAINER_ID=$(sudo docker run --rm -d \
        -p "$PORT:3999" \
        -v "$(pwd)/$data_location:/data" \
        "$DOCKER_IMAGE" \
        npm start localData /data)

    if [ $? -eq 0 ]; then
        echo "✅ Server container started: $CONTAINER_ID"
        echo "🌐 Server should be available at: http://localhost:$PORT"
        echo ""

        # Wait for server to be ready
        echo "⏳ Waiting for server to start (timeout: ${TIMEOUT}s)..."
        for i in $(seq 1 $TIMEOUT); do
            if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
                echo "✅ Server is responding!"
                echo ""
                break
            elif [ $i -eq $TIMEOUT ]; then
                echo "❌ Server failed to respond within ${TIMEOUT}s"
                echo ""
                echo "🔍 Container logs:"
                sudo docker logs "$CONTAINER_ID" 2>&1 | tail -20
                exit 1
            else
                echo -n "."
                sleep 1
            fi
        done

        # Show server status
        echo "📊 Server Status:"
        echo "  Container ID: $CONTAINER_ID"
        echo "  Port: $PORT"
        echo "  URL: http://localhost:$PORT"
        echo ""

        # Test basic endpoints
        echo "🧪 Testing basic endpoints..."

        # Test root endpoint
        if curl -s "http://localhost:$PORT" | grep -q "olmsted\\|html"; then
            echo "  ✅ Root endpoint (/) responds"
        else
            echo "  ❌ Root endpoint (/) failed"
        fi

        # Test datasets endpoint
        if curl -s "http://localhost:$PORT/charon/getDataset" >/dev/null 2>&1; then
            echo "  ✅ Datasets endpoint responds"
        else
            echo "  ⚠️  Datasets endpoint may not be ready"
        fi

        echo ""
        echo "🎯 Test server is running!"
        echo "  - Open http://localhost:$PORT in your browser"
        echo "  - Press Ctrl+C to stop the server"
        echo "  - Container logs: docker logs $CONTAINER_ID"
        echo ""

        # Wait for user interrupt
        echo "⏳ Server running... (Press Ctrl+C to stop)"
        while true; do
            sleep 1
        done

    else
        echo "❌ Failed to start server container"
        exit 1
    fi
fi

echo "✅ Test completed successfully!"
