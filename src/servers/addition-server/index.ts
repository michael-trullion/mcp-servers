import { z } from "zod";
import {
  McpServerTemplate,
  McpServerConfig,
} from "../../template/mcp-server-template.js";

export class AdditionServer extends McpServerTemplate {
  constructor() {
    const config: McpServerConfig = {
      name: "Addition Server",
      version: "1.0.0",
    };
    super(config);
  }

  async initialize(): Promise<void> {
    // Define the "add" tool
    this.server.tool(
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
              {
                type: "text",
                text: `The sum of ${num1} and ${num2} is ${sum}.`,
              },
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
  }
}

// Start the server when this file is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const server = new AdditionServer();

  // Handle termination signals
  process.on("SIGINT", async () => {
    console.log("Received SIGINT signal. Shutting down...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM signal. Shutting down...");
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

export default AdditionServer;
