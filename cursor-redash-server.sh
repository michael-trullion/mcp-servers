#!/bin/bash

# Script to run the redash MCP server for Cursor IDE
cd "$(dirname "$0")"

# Ensure the TypeScript code is built
npm run build

# Run the server with node
node dist/src/servers/redash-server/redash-server.js
