import fetch from "node-fetch";
import { config } from "dotenv";

// Load environment variables
config();

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Check if required environment variables are set
if (!GITHUB_TOKEN) {
  console.error(
    "Error: Missing GITHUB_TOKEN environment variable. Please check your .env file."
  );
  process.exit(1);
}

// Headers used for all requests
const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
};

// Type definitions for GitHub API responses
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  [key: string]: any;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  [key: string]: any;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  [key: string]: any;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  [key: string]: any;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  [key: string]: any;
}

/**
 * Get a list of repositories for the authenticated user
 * @param maxResults Maximum number of results to return (default: 20)
 */
export async function getRepositories(
  maxResults: number = 20
): Promise<GitHubRepo[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/user/repos?per_page=${maxResults}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubRepo[];
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }
}

/**
 * Get repository details
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 */
export async function getRepository(
  owner: string,
  repo: string
): Promise<GitHubRepo> {
  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubRepo;
  } catch (error) {
    console.error(`Error fetching repository ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Get a list of issues for a repository
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param state Filter by state (open, closed, all)
 * @param maxResults Maximum number of results to return (default: 20)
 */
export async function getIssues(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
  maxResults: number = 20
): Promise<GitHubIssue[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/issues?state=${state}&per_page=${maxResults}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubIssue[];
  } catch (error) {
    console.error(`Error fetching issues for ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Get details of a specific issue
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param issueNumber Issue number
 */
export async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubIssue;
  } catch (error) {
    console.error(
      `Error fetching issue #${issueNumber} for ${owner}/${repo}:`,
      error
    );
    throw error;
  }
}

/**
 * Get a list of pull requests for a repository
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param state Filter by state (open, closed, all)
 * @param maxResults Maximum number of results to return (default: 10)
 */
export async function getPullRequests(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
  maxResults: number = 10
): Promise<GitHubPullRequest[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/pulls?state=${state}&per_page=${maxResults}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubPullRequest[];
  } catch (error) {
    console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Get details of a specific pull request
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param prNumber Pull request number
 */
export async function getPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequest> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubPullRequest;
  } catch (error) {
    console.error(
      `Error fetching PR #${prNumber} for ${owner}/${repo}:`,
      error
    );
    throw error;
  }
}

/**
 * Get a list of branches for a repository
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 */
export async function getBranches(
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/branches?per_page=100`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubBranch[];
  } catch (error) {
    console.error(`Error fetching branches for ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Get a list of commits for a repository
 * @param owner Repository owner (username or organization)
 * @param repo Repository name
 * @param branch Branch name (defaults to main branch)
 */
export async function getCommits(
  owner: string,
  repo: string,
  branch?: string
): Promise<GitHubCommit[]> {
  try {
    let url = `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?per_page=50`;
    if (branch) {
      url += `&sha=${branch}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as GitHubCommit[];
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
    throw error;
  }
}
