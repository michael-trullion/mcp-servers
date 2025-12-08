#!/usr/bin/env node
// Redash MCP Server - Entry point
import server from "./redash-server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "url";
import { basename } from "path";
import { realpathSync } from "fs";

export { default } from "./redash-server.js";
export * from "./types.js";
export * as RedashAPI from "./redash-api.js";

// Determine if this module was invoked as the CLI entrypoint (handles symlinks/npx)
function isCliEntrypoint(): boolean {
  try {
    const argvPath = process.argv[1];
    if (!argvPath) return false;
    const scriptPath = realpathSync(argvPath);
    const modulePath = realpathSync(fileURLToPath(import.meta.url));
    if (scriptPath === modulePath) return true;
    const argBase = basename(scriptPath);
    return argBase === "trullion-redash-mcp";
  } catch {
    return false;
  }
}

// Start the server if run directly (supports npx/global bin)
if (isCliEntrypoint()) {
  async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Redash Server started and ready to process requests");
  }
  startServer();
}

