#!/bin/bash

# This script is specifically for Cursor IDE to run the MCP server
# It ensures proper working directory and environment
# Usage: ./cursor-mcp-server.sh [server-name]
# Default server: postgres

# Change to the project directory
cd "$(dirname "$0")"

# Get server name from argument or default to postgres
SERVER_NAME=${1:-postgres}

# Ensure the TypeScript code is built
npm run build > /dev/null 2>&1

# Set the server path based on server name
if [ "$SERVER_NAME" = "pdf" ]; then
    SERVER_PATH="dist/src/servers/lease-pdf-server/pdf-server.js"
else
    SERVER_PATH="dist/src/servers/${SERVER_NAME}-server/${SERVER_NAME}-server.js"
fi

# Run the compiled JavaScript version of the server
# No stdout/stderr redirection to ensure clean stdio communication
node "$SERVER_PATH" 