#!/bin/bash

# set_env.sh - Script to set environment file for react-native-config in iOS builds

ENVFILE=${ENVFILE:-.env}

echo "Using environment file: $ENVFILE"

# Copy the specified environment file to .env
cp "$PROJECT_DIR/../$ENVFILE" "$PROJECT_DIR/../.env"

echo "Environment file set for iOS build"
