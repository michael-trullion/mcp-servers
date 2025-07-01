#!/bin/bash

# Script to run the pdf MCP server for Cursor IDE
cd "$(dirname "$0")"

# Ensure the TypeScript code is built
npm run build

# Run the server with node
node dist/src/servers/lease-pdf-server/pdf-server.js
