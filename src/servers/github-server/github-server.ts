import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import * as GitHubAPI from "./github-api.js";

// Load environment variables
config();

// Create an MCP server
const server = new McpServer({
  name: "GitHub Server",
  version: "1.0.0",
});

// Get repositories tool
server.tool(
  "get_repositories",
  {
    max_results: z
      .number()
      .optional()
      .describe("Maximum number of results to return"),
  },
  async ({ max_results = 20 }) => {
    try {
      const repos = await GitHubAPI.getRepositories(max_results);
      return {
        content: [
          {
            type: "text",
            text: `Found ${repos.length} repositories (limited to ${max_results}).`,
          },
          {
            type: "text",
            text: JSON.stringify(repos, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_repositories handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching repositories: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get repository details tool
server.tool(
  "get_repository",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
  },
  async ({ owner, repo }) => {
    try {
      const repository = await GitHubAPI.getRepository(owner, repo);
      return {
        content: [
          {
            type: "text",
            text: `Repository details for ${owner}/${repo}:`,
          },
          {
            type: "text",
            text: JSON.stringify(repository, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_repository handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching repository ${owner}/${repo}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get issues tool
server.tool(
  "get_issues",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Issue state (open, closed, all)"),
    max_results: z
      .number()
      .optional()
      .describe("Maximum number of results to return"),
  },
  async ({ owner, repo, state = "open", max_results = 20 }) => {
    try {
      const issues = await GitHubAPI.getIssues(owner, repo, state, max_results);
      return {
        content: [
          {
            type: "text",
            text: `Found ${issues.length} ${state} issues for ${owner}/${repo} (limited to ${max_results}).`,
          },
          {
            type: "text",
            text: JSON.stringify(issues, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_issues handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching issues for ${owner}/${repo}: ${
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
server.tool(
  "get_issue",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().describe("Issue number"),
  },
  async ({ owner, repo, issue_number }) => {
    try {
      const issue = await GitHubAPI.getIssue(owner, repo, issue_number);
      return {
        content: [
          {
            type: "text",
            text: `Issue details for ${owner}/${repo}#${issue_number}:`,
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
            text: `Error fetching issue ${owner}/${repo}#${issue_number}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get pull requests tool
server.tool(
  "get_pull_requests",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Pull request state (open, closed, all)"),
    max_results: z
      .number()
      .optional()
      .describe("Maximum number of results to return"),
  },
  async ({ owner, repo, state = "open", max_results = 10 }) => {
    try {
      const prs = await GitHubAPI.getPullRequests(
        owner,
        repo,
        state,
        max_results
      );
      return {
        content: [
          {
            type: "text",
            text: `Found ${prs.length} ${state} pull requests for ${owner}/${repo} (limited to ${max_results}).`,
          },
          {
            type: "text",
            text: JSON.stringify(prs, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_pull_requests handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching pull requests for ${owner}/${repo}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get pull request details tool
server.tool(
  "get_pull_request",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    pr_number: z.number().describe("Pull request number"),
  },
  async ({ owner, repo, pr_number }) => {
    try {
      const pr = await GitHubAPI.getPullRequest(owner, repo, pr_number);
      return {
        content: [
          {
            type: "text",
            text: `Pull request details for ${owner}/${repo}#${pr_number}:`,
          },
          {
            type: "text",
            text: JSON.stringify(pr, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_pull_request handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching pull request ${owner}/${repo}#${pr_number}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get branches tool
server.tool(
  "get_branches",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
  },
  async ({ owner, repo }) => {
    try {
      const branches = await GitHubAPI.getBranches(owner, repo);
      return {
        content: [
          {
            type: "text",
            text: `Found ${branches.length} branches for ${owner}/${repo}.`,
          },
          {
            type: "text",
            text: JSON.stringify(branches, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_branches handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching branches for ${owner}/${repo}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get commits tool
server.tool(
  "get_commits",
  {
    owner: z.string().describe("Repository owner (username or organization)"),
    repo: z.string().describe("Repository name"),
    branch: z
      .string()
      .optional()
      .describe("Branch name (defaults to main branch)"),
  },
  async ({ owner, repo, branch }) => {
    try {
      const commits = await GitHubAPI.getCommits(owner, repo, branch);
      return {
        content: [
          {
            type: "text",
            text: `Found ${commits.length} commits for ${owner}/${repo}${
              branch ? ` on branch ${branch}` : ""
            }.`,
          },
          {
            type: "text",
            text: JSON.stringify(commits, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in get_commits handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching commits for ${owner}/${repo}: ${
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
    console.log("GitHub Server started and ready to process requests");
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
