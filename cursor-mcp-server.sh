#!/bin/bash

# This script is specifically for Cursor IDE to run the MCP server
# It ensures proper working directory and environment

# Change to the project directory
cd "$(dirname "$0")"

# Run the compiled JavaScript version of the server
# No stdout/stderr redirection to ensure clean stdio communication
node dist/src/servers/addition-server/addition-server.js 