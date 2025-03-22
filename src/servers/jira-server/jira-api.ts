import fetch from "node-fetch";
import { config } from "dotenv";

// Load environment variables
config();

const JIRA_API_URL = process.env.JIRA_API_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Check if required environment variables are set
if (!JIRA_API_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error(
    "Error: Missing required environment variables. Please check your .env file."
  );
  process.exit(1);
}

// Base64 encode credentials for Basic Auth
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// Headers used for all requests
const headers = {
  Authorization: `Basic ${auth}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

// Type definitions for Jira API responses
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  [key: string]: any;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface JiraIssueSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  [key: string]: any;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  [key: string]: any;
}

export interface JiraBoardsResult {
  values: JiraBoard[];
  total: number;
  [key: string]: any;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  [key: string]: any;
}

export interface JiraSprintsResult {
  values: JiraSprint[];
  total: number;
  [key: string]: any;
}

/**
 * Get a list of projects
 */
export async function getProjects(): Promise<JiraProject[]> {
  try {
    const response = await fetch(`${JIRA_API_URL}/rest/api/3/project`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as JiraProject[];
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}

/**
 * Get project details by key
 * @param projectKey The project key
 */
export async function getProject(projectKey: string): Promise<JiraProject> {
  try {
    const response = await fetch(
      `${JIRA_API_URL}/rest/api/3/project/${projectKey}`,
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

    return (await response.json()) as JiraProject;
  } catch (error) {
    console.error(`Error fetching project ${projectKey}:`, error);
    throw error;
  }
}

/**
 * Search for issues using JQL
 * @param jql JQL query string
 * @param maxResults Maximum number of results to return
 */
export async function searchIssues(
  jql: string,
  maxResults: number = 20
): Promise<JiraIssueSearchResult> {
  try {
    const response = await fetch(`${JIRA_API_URL}/rest/api/3/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jql,
        maxResults,
        fields: [
          "summary",
          "status",
          "assignee",
          "priority",
          "created",
          "updated",
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as JiraIssueSearchResult;
  } catch (error) {
    console.error("Error searching issues:", error);
    throw error;
  }
}

/**
 * Get issue details by key
 * @param issueKey The issue key
 */
export async function getIssue(issueKey: string): Promise<JiraIssue> {
  try {
    const response = await fetch(
      `${JIRA_API_URL}/rest/api/3/issue/${issueKey}`,
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

    return (await response.json()) as JiraIssue;
  } catch (error) {
    console.error(`Error fetching issue ${issueKey}:`, error);
    throw error;
  }
}

/**
 * Get all boards
 */
export async function getBoards(): Promise<JiraBoardsResult> {
  try {
    const response = await fetch(`${JIRA_API_URL}/rest/agile/1.0/board`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error: ${response.status} - ${response.statusText}`
      );
    }

    return (await response.json()) as JiraBoardsResult;
  } catch (error) {
    console.error("Error fetching boards:", error);
    throw error;
  }
}

/**
 * Get sprints for a board
 * @param boardId The board ID
 */
export async function getSprints(boardId: number): Promise<JiraSprintsResult> {
  try {
    const response = await fetch(
      `${JIRA_API_URL}/rest/agile/1.0/board/${boardId}/sprint`,
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

    return (await response.json()) as JiraSprintsResult;
  } catch (error) {
    console.error(`Error fetching sprints for board ${boardId}:`, error);
    throw error;
  }
}
