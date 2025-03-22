import { z } from "zod";
import {
  McpServerTemplate,
  McpServerConfig,
} from "../../template/mcp-server-template.js";
import * as JiraAPI from "./jira-api.js";

export class JiraServer extends McpServerTemplate {
  constructor() {
    const config: McpServerConfig = {
      name: "Jira Server",
      version: "1.0.0",
    };
    super(config);
  }

  async initialize(): Promise<void> {
    // Get projects tool
    this.server.tool("get_projects", {}, async () => {
      try {
        const projects = await JiraAPI.getProjects();
        return {
          content: [
            {
              type: "text",
              text: `Found ${projects.length} projects.`,
            },
            {
              type: "text",
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error in get_projects handler:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error fetching projects: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });

    // Get project details tool
    this.server.tool(
      "get_project",
      {
        project_key: z.string().describe("The Jira project key (e.g., 'PROJ')"),
      },
      async ({ project_key }) => {
        try {
          const project = await JiraAPI.getProject(project_key);
          return {
            content: [
              {
                type: "text",
                text: `Project details for ${project_key}:`,
              },
              {
                type: "text",
                text: JSON.stringify(project, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("Error in get_project handler:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching project ${project_key}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Search issues tool
    this.server.tool(
      "search_issues",
      {
        jql: z
          .string()
          .describe(
            "JQL query (e.g., 'project = PROJ AND status = \"In Progress\"')"
          ),
        max_results: z
          .number()
          .optional()
          .describe("Maximum number of results to return"),
      },
      async ({ jql, max_results }) => {
        try {
          const issues = await JiraAPI.searchIssues(jql, max_results);
          return {
            content: [
              {
                type: "text",
                text: `Found ${issues.total} issues, showing ${issues.issues.length}.`,
              },
              {
                type: "text",
                text: JSON.stringify(issues, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("Error in search_issues handler:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error searching issues: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get issue details tool
    this.server.tool(
      "get_issue",
      {
        issue_key: z.string().describe("The Jira issue key (e.g., 'PROJ-123')"),
      },
      async ({ issue_key }) => {
        try {
          const issue = await JiraAPI.getIssue(issue_key);
          return {
            content: [
              {
                type: "text",
                text: `Issue details for ${issue_key}:`,
              },
              {
                type: "text",
                text: JSON.stringify(issue, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("Error in get_issue handler:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching issue ${issue_key}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get boards tool
    this.server.tool("get_boards", {}, async () => {
      try {
        const boards = await JiraAPI.getBoards();
        return {
          content: [
            {
              type: "text",
              text: `Found ${boards.total} boards, showing ${boards.values.length}.`,
            },
            {
              type: "text",
              text: JSON.stringify(boards, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error in get_boards handler:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error fetching boards: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });

    // Get sprints tool
    this.server.tool(
      "get_sprints",
      {
        board_id: z.number().describe("The board ID"),
      },
      async ({ board_id }) => {
        try {
          const sprints = await JiraAPI.getSprints(board_id);
          return {
            content: [
              {
                type: "text",
                text: `Found ${sprints.total} sprints, showing ${sprints.values.length}.`,
              },
              {
                type: "text",
                text: JSON.stringify(sprints, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("Error in get_sprints handler:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching sprints for board ${board_id}: ${
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
  const server = new JiraServer();

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

export default JiraServer;
