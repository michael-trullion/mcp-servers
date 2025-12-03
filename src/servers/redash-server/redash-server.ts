import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import * as RedashAPI from "./redash-api.js";
import { QueryParameterValue, DateRangeValue } from "./types.js";

// Load environment variables
config();

// Create an MCP server
const server = new McpServer({
  name: "Redash Server",
  version: "1.0.0",
});

// ============================================
// Query Tools (Read-Only)
// ============================================

// List queries tool
server.tool(
  "list_queries",
  {
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (default: 1)"),
    page_size: z
      .number()
      .optional()
      .describe("Number of results per page (default: 25)"),
  },
  async ({ page = 1, page_size = 25 }) => {
    try {
      const queries = await RedashAPI.listQueries(page, page_size);
      return {
        content: [
          {
            type: "text",
            text: `Found ${queries.count} queries (showing page ${page} of ${Math.ceil(queries.count / page_size)}).`,
          },
          {
            type: "text",
            text: JSON.stringify(queries, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in list_queries handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing queries: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get query tool
server.tool(
  "get_query",
  {
    query_id: z.number().describe("The ID of the query to retrieve"),
  },
  async ({ query_id }) => {
    try {
      const query = await RedashAPI.getQuery(query_id);
      return {
        content: [
          {
            type: "text",
            text: `Query "${query.name}" (ID: ${query.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(query, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_query handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Execute query tool
server.tool(
  "execute_query",
  {
    query_id: z.number().describe("The ID of the query to execute"),
    parameters: z
      .record(z.unknown())
      .optional()
      .describe(
        "Parameters for the query as key-value pairs. For date ranges, use {start: 'YYYY-MM-DD', end: 'YYYY-MM-DD'}"
      ),
    max_age: z
      .number()
      .optional()
      .describe(
        "Maximum age of cached results in seconds. Set to 0 to force fresh execution"
      ),
    wait_for_result: z
      .boolean()
      .optional()
      .describe(
        "If true, wait for the query to complete and return results (default: true)"
      ),
    format: z
      .enum(["json", "csv"])
      .optional()
      .describe("Output format for results (default: json)"),
  },
  async ({
    query_id,
    parameters,
    max_age,
    wait_for_result = true,
    format = "json",
  }) => {
    try {
      // Convert parameters to the correct type
      const typedParams: Record<string, QueryParameterValue> | undefined =
        parameters as Record<string, QueryParameterValue> | undefined;

      if (wait_for_result) {
        const { result, job, fromCache } = await RedashAPI.executeQueryAndWait(
          query_id,
          { parameters: typedParams, max_age },
          format
        );

        const cacheInfo = fromCache
          ? "Results returned from cache."
          : `Query executed fresh${job ? ` (job ID: ${job.id})` : ""}.`;

        if (format === "csv") {
          return {
            content: [
              {
                type: "text",
                text: `Query ${query_id} executed successfully. ${cacheInfo}`,
              },
              {
                type: "text",
                text: result as string,
              },
            ],
          };
        }

        const queryResult = result as Awaited<
          ReturnType<typeof RedashAPI.getQueryResult>
        >;
        return {
          content: [
            {
              type: "text",
              text: `Query ${query_id} executed successfully. ${cacheInfo}`,
            },
            {
              type: "text",
              text: JSON.stringify(queryResult, null, 2),
            },
          ],
        };
      } else {
        // Just start execution and return job info
        const response = await RedashAPI.executeQuery(query_id, {
          parameters: typedParams,
          max_age,
        });

        if (response.query_result) {
          return {
            content: [
              {
                type: "text",
                text: `Query ${query_id} returned cached results.`,
              },
              {
                type: "text",
                text: JSON.stringify(response.query_result, null, 2),
              },
            ],
          };
        }

        if (response.job) {
          return {
            content: [
              {
                type: "text",
                text: `Query ${query_id} execution started. Job ID: ${response.job.id}. Use get_job_status to check progress.`,
              },
              {
                type: "text",
                text: JSON.stringify(response.job, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: "Unexpected response from Redash API",
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      console.error("Error in execute_query handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get job status tool
server.tool(
  "get_job_status",
  {
    job_id: z.string().describe("The job ID returned from execute_query"),
  },
  async ({ job_id }) => {
    try {
      const job = await RedashAPI.getJobStatus(job_id);
      const statusName = RedashAPI.getJobStatusName(job.status);

      let statusMessage = `Job ${job_id} status: ${statusName}`;
      if (job.status === 3 && job.query_result_id) {
        statusMessage += `. Results available with query_result_id: ${job.query_result_id}`;
      } else if (job.status === 4 && job.error) {
        statusMessage += `. Error: ${job.error}`;
      }

      return {
        content: [
          {
            type: "text",
            text: statusMessage,
          },
          {
            type: "text",
            text: JSON.stringify(job, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_job_status handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting job status: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get query result tool
server.tool(
  "get_query_result",
  {
    query_result_id: z
      .number()
      .describe("The query result ID to retrieve"),
    format: z
      .enum(["json", "csv"])
      .optional()
      .describe("Output format (default: json)"),
  },
  async ({ query_result_id, format = "json" }) => {
    try {
      const result = await RedashAPI.getQueryResult(query_result_id, format);

      if (format === "csv") {
        return {
          content: [
            {
              type: "text",
              text: `Query result ${query_result_id} (CSV format):`,
            },
            {
              type: "text",
              text: result as string,
            },
          ],
        };
      }

      const jsonResult = result as Awaited<
        ReturnType<typeof RedashAPI.getQueryResult>
      >;
      return {
        content: [
          {
            type: "text",
            text: `Query result ${query_result_id}:`,
          },
          {
            type: "text",
            text: JSON.stringify(jsonResult, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_query_result handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting query result: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// Dashboard Tools (Read/Write)
// ============================================

// List dashboards tool
server.tool(
  "list_dashboards",
  {
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (default: 1)"),
    page_size: z
      .number()
      .optional()
      .describe("Number of results per page (default: 25)"),
  },
  async ({ page = 1, page_size = 25 }) => {
    try {
      const dashboards = await RedashAPI.listDashboards(page, page_size);
      return {
        content: [
          {
            type: "text",
            text: `Found ${dashboards.count} dashboards (showing page ${page} of ${Math.ceil(dashboards.count / page_size)}).`,
          },
          {
            type: "text",
            text: JSON.stringify(dashboards, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in list_dashboards handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing dashboards: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get dashboard tool
server.tool(
  "get_dashboard",
  {
    slug: z
      .string()
      .describe("The dashboard slug (URL-friendly name) to retrieve"),
  },
  async ({ slug }) => {
    try {
      const dashboard = await RedashAPI.getDashboard(slug);
      return {
        content: [
          {
            type: "text",
            text: `Dashboard "${dashboard.name}" (ID: ${dashboard.id}, slug: ${dashboard.slug})`,
          },
          {
            type: "text",
            text: JSON.stringify(dashboard, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_dashboard handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting dashboard: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Create dashboard tool
server.tool(
  "create_dashboard",
  {
    name: z.string().describe("Name for the new dashboard"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Optional array of tags for the dashboard"),
  },
  async ({ name, tags }) => {
    try {
      const dashboard = await RedashAPI.createDashboard({ name, tags });
      return {
        content: [
          {
            type: "text",
            text: `Successfully created dashboard "${dashboard.name}" (ID: ${dashboard.id}, slug: ${dashboard.slug})`,
          },
          {
            type: "text",
            text: JSON.stringify(dashboard, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in create_dashboard handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating dashboard: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Update dashboard tool
server.tool(
  "update_dashboard",
  {
    dashboard_id: z.number().describe("The dashboard ID to update"),
    name: z.string().optional().describe("New name for the dashboard"),
    is_draft: z
      .boolean()
      .optional()
      .describe("Set draft status of the dashboard"),
    is_archived: z
      .boolean()
      .optional()
      .describe("Set archived status of the dashboard"),
    tags: z
      .array(z.string())
      .optional()
      .describe("New tags for the dashboard"),
    dashboard_filters_enabled: z
      .boolean()
      .optional()
      .describe("Enable or disable dashboard filters"),
  },
  async ({
    dashboard_id,
    name,
    is_draft,
    is_archived,
    tags,
    dashboard_filters_enabled,
  }) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (is_draft !== undefined) updateData.is_draft = is_draft;
      if (is_archived !== undefined) updateData.is_archived = is_archived;
      if (tags !== undefined) updateData.tags = tags;
      if (dashboard_filters_enabled !== undefined)
        updateData.dashboard_filters_enabled = dashboard_filters_enabled;

      const dashboard = await RedashAPI.updateDashboard(
        dashboard_id,
        updateData
      );
      return {
        content: [
          {
            type: "text",
            text: `Successfully updated dashboard "${dashboard.name}" (ID: ${dashboard.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(dashboard, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in update_dashboard handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error updating dashboard: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Delete dashboard tool
server.tool(
  "delete_dashboard",
  {
    slug: z.string().describe("The dashboard slug to archive/delete"),
  },
  async ({ slug }) => {
    try {
      await RedashAPI.deleteDashboard(slug);
      return {
        content: [
          {
            type: "text",
            text: `Successfully archived dashboard with slug "${slug}"`,
          },
        ],
      };
    } catch (error) {
      console.error("Error in delete_dashboard handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error deleting dashboard: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================
// Server Lifecycle
// ============================================

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
  console.log("Redash Server started and ready to process requests");
}

// Start the server if this file is run directly
if (import.meta.url === new URL(import.meta.url).href) {
  startServer();
}

export default server;

