#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Function to get available servers from package.json
function getAvailableServers() {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  return Object.keys(packageJson.scripts)
    .filter((script) => script.startsWith("start:") && script !== "start:all")
    .map((script) => script.replace("start:", ""));
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const availableServers = getAvailableServers();

  // Display help if no arguments or help is requested
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: node scripts/run-server.js [server-name]");
    console.log("");
    console.log("Available servers:");
    availableServers.forEach((server) => {
      console.log(`  - ${server}`);
    });
    console.log("");
    console.log("Example: node scripts/run-server.js jira");
    return;
  }

  const serverName = args[0];

  // Check if server exists
  if (!availableServers.includes(serverName)) {
    console.error(`Error: Server "${serverName}" not found.`);
    console.log("Available servers:");
    availableServers.forEach((server) => {
      console.log(`  - ${server}`);
    });
    process.exit(1);
  }

  // Run the server
  console.log(`Starting ${serverName} server...`);

  // First build the TypeScript code
  const buildProcess = spawn("npm", ["run", "build"], {
    stdio: "inherit",
    cwd: projectRoot,
  });

  buildProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`Error: Build failed with code ${code}`);
      process.exit(code);
    }

    // Then run the server
    const serverProcess = spawn("npm", ["run", `start:${serverName}`], {
      stdio: "inherit",
      cwd: projectRoot,
    });

    serverProcess.on("close", (code) => {
      console.log(`Server exited with code ${code}`);
      process.exit(code);
    });

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("Received SIGINT. Shutting down server...");
      serverProcess.kill("SIGINT");
    });

    process.on("SIGTERM", () => {
      console.log("Received SIGTERM. Shutting down server...");
      serverProcess.kill("SIGTERM");
    });
  });
}

// Run the main function
main();
