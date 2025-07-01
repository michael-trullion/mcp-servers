#!/bin/bash

# Log file for debugging
LOG_FILE="$HOME/mcp-server-cursor.log"

# Get server name from argument or default to jira
SERVER_NAME=${1:-jira}

# Log start time and command
echo "=== Starting MCP Server $(date) ===" > "$LOG_FILE"
echo "Working directory: $(pwd)" >> "$LOG_FILE"
echo "Command: $0 $@" >> "$LOG_FILE"
echo "Server: $SERVER_NAME" >> "$LOG_FILE"
echo "Environment:" >> "$LOG_FILE"
env >> "$LOG_FILE"

# Change to the project directory
cd "$(dirname "$0")"
echo "Changed to directory: $(pwd)" >> "$LOG_FILE"

# Run the server with ts-node loader
echo "Running server..." >> "$LOG_FILE"
NODE_OPTIONS="--loader ts-node/esm" node "src/servers/${SERVER_NAME}-server/${SERVER_NAME}-server.ts" 2>> "$LOG_FILE"

# Log exit code
echo "Server exited with code: $?" >> "$LOG_FILE" 