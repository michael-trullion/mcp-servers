import { z } from "zod";
import {
  McpServerTemplate,
  McpServerConfig,
} from "../../template/mcp-server-template.js";
import * as GitHubAPI from "./github-api.js";

export class GitHubServer extends McpServerTemplate {
  constructor() {
    const config: McpServerConfig = {
      name: "GitHub Server",
      version: "1.0.0",
    };
    super(config);
  }

  async initialize(): Promise<void> {
    // Get repositories tool
    this.server.tool("get_repositories", {}, async () => {
      try {
        const repos = await GitHubAPI.getRepositories();
        return {
          content: [
            {
              type: "text",
              text: `Found ${repos.length} repositories.`,
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
    });

    // Get repository details tool
    this.server.tool(
      "get_repository",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
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
    this.server.tool(
      "get_issues",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
        state: z
          .enum(["open", "closed", "all"])
          .optional()
          .describe("Issue state (open, closed, all)"),
      },
      async ({ owner, repo, state = "open" }) => {
        try {
          const issues = await GitHubAPI.getIssues(owner, repo, state);
          return {
            content: [
              {
                type: "text",
                text: `Found ${issues.length} ${state} issues for ${owner}/${repo}.`,
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
    this.server.tool(
      "get_issue",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
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
    this.server.tool(
      "get_pull_requests",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
        state: z
          .enum(["open", "closed", "all"])
          .optional()
          .describe("Pull request state (open, closed, all)"),
      },
      async ({ owner, repo, state = "open" }) => {
        try {
          const prs = await GitHubAPI.getPullRequests(owner, repo, state);
          return {
            content: [
              {
                type: "text",
                text: `Found ${prs.length} ${state} pull requests for ${owner}/${repo}.`,
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
    this.server.tool(
      "get_pull_request",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
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
    this.server.tool(
      "get_branches",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
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
    this.server.tool(
      "get_commits",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
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

    // Comment on PR tool
    this.server.tool(
      "comment_on_pr",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
        pr_number: z.number().describe("Pull request number"),
        comment: z.string().describe("Comment content"),
      },
      async ({ owner, repo, pr_number, comment }) => {
        try {
          const result = await GitHubAPI.createPullRequestComment(
            owner,
            repo,
            pr_number,
            comment
          );

          return {
            content: [
              {
                type: "text",
                text: `Successfully added comment to PR #${pr_number}.`,
              },
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("Error in comment_on_pr handler:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error commenting on PR #${pr_number} for ${owner}/${repo}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Summarize PR differences and comment
    this.server.tool(
      "summarize_pr_diff",
      {
        owner: z
          .string()
          .describe("Repository owner (username or organization)"),
        repo: z.string().describe("Repository name"),
        pr_number: z.number().describe("Pull request number"),
        post_comment: z
          .boolean()
          .optional()
          .describe("Whether to post the summary as a comment (default: true)"),
      },
      async ({ owner, repo, pr_number, post_comment = true }) => {
        try {
          // Get PR details first
          const pr = await GitHubAPI.getPullRequest(owner, repo, pr_number);

          // Get the changes
          const files = await GitHubAPI.getPullRequestFiles(
            owner,
            repo,
            pr_number
          );

          // Create a summary
          let summary = `# PR Summary: ${pr.title}\n\n`;
          summary += `${pr.body ? pr.body + "\n\n" : ""}`;
          summary += `## Changes Overview\n\n`;
          summary += `This PR contains ${files.length} file(s) with:\n`;

          const totalAdditions = files.reduce(
            (sum, file) => sum + file.additions,
            0
          );
          const totalDeletions = files.reduce(
            (sum, file) => sum + file.deletions,
            0
          );

          summary += `- ${totalAdditions} additions(+)\n`;
          summary += `- ${totalDeletions} deletions(-)\n\n`;

          summary += `## Files Changed\n\n`;

          // List the files with the most significant changes first
          const sortedFiles = [...files].sort((a, b) => b.changes - a.changes);

          sortedFiles.slice(0, 10).forEach((file) => {
            summary += `- \`${file.filename}\`: ${file.additions} addition(s), ${file.deletions} deletion(s)\n`;
          });

          if (files.length > 10) {
            summary += `- ... and ${files.length - 10} more files\n`;
          }

          // Post the comment if requested
          if (post_comment) {
            await GitHubAPI.createPullRequestComment(
              owner,
              repo,
              pr_number,
              summary
            );
          }

          return {
            content: [
              {
                type: "text",
                text: `PR #${pr_number} summary ${
                  post_comment ? "created and posted as a comment" : "generated"
                }:`,
              },
              {
                type: "text",
                text: summary,
              },
              {
                type: "text",
                text: JSON.stringify(
                  {
                    owner,
                    repo,
                    pr_number,
                    title: pr.title,
                    files_changed: files.length,
                    additions: totalAdditions,
                    deletions: totalDeletions,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          console.error("Error in summarize_pr_diff handler:", error);
          return {
            content: [
              {
                type: "text",
                text: `Error summarizing PR #${pr_number} for ${owner}/${repo}: ${
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
  const server = new GitHubServer();

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

export default GitHubServer;
