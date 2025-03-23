import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import * as K8sAPI from "./kubernetes-api.js";

// Load environment variables
config();

// Create an MCP server
const server = new McpServer({
  name: "Kubernetes Server",
  version: "1.0.0",
});

// Get pods tool
server.tool(
  "get_pods",
  {
    namespace: z
      .string()
      .optional()
      .describe("Kubernetes namespace (default: local)"),
    label_selector: z
      .string()
      .optional()
      .describe("Label selector to filter pods (e.g. 'app=myapp')"),
    field_selector: z
      .string()
      .optional()
      .describe("Field selector to filter pods (e.g. 'status.phase=Running')"),
  },
  async ({ namespace = "local", label_selector, field_selector }) => {
    try {
      const pods = await K8sAPI.getPods(
        namespace,
        label_selector,
        field_selector
      );
      return {
        content: [
          {
            type: "text",
            text: `Found ${pods.items.length} pods in namespace '${namespace}'.`,
          },
          {
            type: "text",
            text: JSON.stringify(pods, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_pods handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching pods: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Find pods tool
server.tool(
  "find_pods",
  {
    name_pattern: z
      .string()
      .describe(
        "Pod name pattern to search for (supports wildcards, e.g. 'nginx*')"
      ),
    namespace: z
      .string()
      .optional()
      .describe("Kubernetes namespace (default: local)"),
  },
  async ({ name_pattern, namespace = "local" }) => {
    try {
      const pods = await K8sAPI.findPodsByName(name_pattern, namespace);
      return {
        content: [
          {
            type: "text",
            text: `Found ${pods.items.length} pods matching '${name_pattern}' in namespace '${namespace}'.`,
          },
          {
            type: "text",
            text: JSON.stringify(pods, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in find_pods handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error finding pods: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Kill pod tool
server.tool(
  "kill_pod",
  {
    pod_name: z.string().describe("Name of the pod to delete"),
    namespace: z
      .string()
      .optional()
      .describe("Kubernetes namespace (default: local)"),
    grace_period_seconds: z
      .number()
      .optional()
      .describe("Grace period in seconds before force deletion"),
  },
  async ({ pod_name, namespace = "local", grace_period_seconds }) => {
    try {
      const result = await K8sAPI.deletePod(
        pod_name,
        namespace,
        grace_period_seconds
      );
      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted pod '${pod_name}' in namespace '${namespace}'.`,
          },
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in kill_pod handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error deleting pod: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Execute command in pod tool
server.tool(
  "exec_in_pod",
  {
    pod_name: z.string().describe("Name of the pod"),
    command: z.string().describe("Command to execute (e.g. 'ls -la')"),
    container_name: z
      .string()
      .optional()
      .describe("Container name (if pod has multiple containers)"),
    namespace: z
      .string()
      .optional()
      .describe("Kubernetes namespace (default: local)"),
  },
  async ({ pod_name, command, container_name, namespace = "local" }) => {
    try {
      const result = await K8sAPI.execCommandInPod(
        pod_name,
        command,
        namespace,
        container_name
      );
      return {
        content: [
          {
            type: "text",
            text: `Command execution results from pod '${pod_name}' in namespace '${namespace}':`,
          },
          {
            type: "text",
            text: result.stdout,
          },
          {
            type: "text",
            text: result.stderr ? `Error output: ${result.stderr}` : "",
          },
        ],
      };
    } catch (error) {
      console.error("Error in exec_in_pod handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error executing command in pod: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get pod logs tool
server.tool(
  "get_pod_logs",
  {
    pod_name: z.string().describe("Name of the pod"),
    container_name: z
      .string()
      .optional()
      .describe("Container name (if pod has multiple containers)"),
    namespace: z
      .string()
      .optional()
      .describe("Kubernetes namespace (default: local)"),
    tail_lines: z
      .number()
      .optional()
      .describe("Number of lines to fetch from the end"),
    previous: z
      .boolean()
      .optional()
      .describe("Get logs from previous terminated container instance"),
  },
  async ({
    pod_name,
    container_name,
    namespace = "local",
    tail_lines,
    previous,
  }) => {
    try {
      const logs = await K8sAPI.getPodLogs(
        pod_name,
        namespace,
        container_name,
        tail_lines,
        previous
      );
      return {
        content: [
          {
            type: "text",
            text: `Logs from pod '${pod_name}' in namespace '${namespace}':`,
          },
          {
            type: "text",
            text: logs,
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_pod_logs handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting pod logs: ${
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Kubernetes Server started and ready to process requests");
}

// Start the server if this file is run directly
if (import.meta.url === new URL(import.meta.url).href) {
  startServer();
}

export default server;
