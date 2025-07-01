#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Create individual server script for each MCP server
function createServerScripts() {
  // Read package.json to get the list of servers
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
  );

  // Extract start scripts for servers
  const serverScripts = Object.keys(packageJson.scripts)
    .filter((script) => script.startsWith("start:") && script !== "start:all")
    .map((script) => {
      const serverName = script.replace("start:", "");
      const scriptPath = packageJson.scripts[script];
      const jsPath = scriptPath.replace("node ", "");

      return {
        serverName,
        scriptPath,
        jsPath,
      };
    });

  // Create script for each server
  serverScripts.forEach((server) => {
    const scriptName = `cursor-${server.serverName}-server.sh`;
    const scriptPath = path.join(projectRoot, scriptName);

    const scriptContent = `#!/bin/bash

# Script to run the ${server.serverName} MCP server for Cursor IDE
cd "$(dirname "$0")"

# Ensure the TypeScript code is built
npm run build

# Run the server with node
node ${server.jsPath}
`;

    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`Created ${scriptName}`);
  });

  // Make all scripts executable
  serverScripts.forEach((server) => {
    const scriptName = `cursor-${server.serverName}-server.sh`;
    const scriptPath = path.join(projectRoot, scriptName);
    fs.chmodSync(scriptPath, "755");
  });

  // Generate workspace path (used for absolute paths in instructions)
  const workspacePath = process.cwd();

  // Print instructions
  console.log("\n===== CURSOR IDE SETUP INSTRUCTIONS =====\n");
  console.log("To use these MCP servers in Cursor IDE:");
  console.log("1. Open Cursor IDE");
  console.log("2. Go to Cursor Settings > Features > Model Context Protocol");
  console.log("3. Edit the mcp.json file or paste this configuration:");
  console.log("4. Add the following to your mcp.json file under mcpServers:\n");

  console.log("```json");
  console.log('"mcpServers": {');

  serverScripts.forEach((server, index) => {
    const scriptName = `cursor-${server.serverName}-server.sh`;
    const absoluteScriptPath = path.join(workspacePath, scriptName);
    const isLast = index === serverScripts.length - 1;

    console.log(`  "${server.serverName}": {`);
    console.log(`    "command": "${absoluteScriptPath}",`);
    console.log(`    "args": []`);
    console.log(`  }${isLast ? "" : ","}`);
  });

  console.log("}");
  console.log("```\n");

  console.log(
    "After adding these configurations, restart Cursor IDE and the MCP servers"
  );
  console.log("will be available for use in the composer.\n");
}

// Run the function
createServerScripts();
