import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Addition Server",
  version: "1.0.0",
});

// Add an addition tool
server.tool(
  "add",
  {
    num1: z.number().describe("First number to add"),
    num2: z.number().describe("Second number to add"),
  },
  async ({ num1, num2 }) => {
    try {
      const sum = num1 + num2;
      return {
        content: [
          { type: "text", text: `The sum of ${num1} and ${num2} is ${sum}.` },
          {
            type: "text",
            text: JSON.stringify({ num1, num2, sum }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in add handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error calculating the sum: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Handle termination signals
process.on("SIGINT", () => {
  console.log("Received SIGINT signal. Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM signal. Shutting down...");
  process.exit(0);
});

// Start the server
async function startServer() {
  try {
    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Addition Server started and ready to process requests");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}

export default server;
