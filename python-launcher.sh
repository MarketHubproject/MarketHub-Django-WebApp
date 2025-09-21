#!/bin/bash
# Robust Python launcher for deployment environments
# This script finds the correct Python executable and runs the command

set -e

# Function to find Python executable
find_python() {
    if command -v python3 &> /dev/null; then
        echo "python3"
    elif command -v python &> /dev/null; then
        echo "python"
    else
        echo "❌ Error: No Python executable found" >&2
        exit 1
    fi
}

# Get the Python executable
PYTHON_CMD=$(find_python)
echo "🐍 Using Python executable: $PYTHON_CMD"

# Execute the command passed as arguments
exec "$PYTHON_CMD" "$@"