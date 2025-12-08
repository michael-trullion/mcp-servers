import { config } from "dotenv";
import {
  RedashConfig,
  RedashQuery,
  PaginatedQueries,
  CreateQueryRequest,
  UpdateQueryRequest,
  QueryExecutionRequest,
  QueryExecutionResponse,
  RedashJob,
  RedashQueryResult,
  RedashDashboard,
  PaginatedDashboards,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  CreateWidgetRequest,
  UpdateWidgetRequest,
  DashboardWidget,
  CreateVisualizationRequest,
  QueryVisualization,
  RedashDataSource,
  PaginatedDataSources,
  JOB_STATUS_NAMES,
  JobStatus,
} from "./types.js";

// Load environment variables
config();

// ============================================
// Configuration
// ============================================

function getConfig(): RedashConfig {
  const url = process.env.REDASH_URL;
  const apiKey = process.env.REDASH_API_KEY;

  if (!url || !apiKey) {
    throw new Error(
      "Missing required environment variables: REDASH_URL and REDASH_API_KEY must be set"
    );
  }

  // Remove trailing slash from URL if present
  return {
    url: url.replace(/\/$/, ""),
    apiKey,
  };
}

// ============================================
// HTTP Client
// ============================================

async function redashFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();
  const url = `${config.url}${endpoint}`;

  const headers: HeadersInit = {
    Authorization: `Key ${config.apiKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(
      `Redash API error (${response.status}): ${errorMessage}`
    );
  }

  // Handle empty responses (e.g., DELETE)
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// ============================================
// Query API (Read-Only)
// ============================================

/**
 * List all queries with pagination
 * @param page Page number (1-based)
 * @param pageSize Number of results per page
 */
export async function listQueries(
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedQueries> {
  return redashFetch<PaginatedQueries>(
    `/api/queries?page=${page}&page_size=${pageSize}`
  );
}

/**
 * Get a single query by ID
 * @param queryId Query ID
 */
export async function getQuery(queryId: number): Promise<RedashQuery> {
  return redashFetch<RedashQuery>(`/api/queries/${queryId}`);
}

/**
 * Fork (duplicate) an existing query
 * Creates a copy of the query with the same SQL without requiring SQL to be written
 * @param queryId Query ID to fork
 */
export async function forkQuery(queryId: number): Promise<RedashQuery> {
  return redashFetch<RedashQuery>(`/api/queries/${queryId}/fork`, {
    method: "POST",
  });
}

/**
 * Create a new query
 * @param data Query creation data including name, SQL, and data source
 */
export async function createQuery(
  data: CreateQueryRequest
): Promise<RedashQuery> {
  return redashFetch<RedashQuery>("/api/queries", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing query
 * @param queryId Query ID to update
 * @param data Query update data
 */
export async function updateQuery(
  queryId: number,
  data: UpdateQueryRequest
): Promise<RedashQuery> {
  return redashFetch<RedashQuery>(`/api/queries/${queryId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Create a visualization for a query
 * @param data Visualization creation data
 */
export async function createVisualization(
  data: CreateVisualizationRequest
): Promise<QueryVisualization> {
  return redashFetch<QueryVisualization>("/api/visualizations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Publish a query (mark as non-draft)
 * @param queryId Query ID to publish
 */
export async function publishQuery(queryId: number): Promise<RedashQuery> {
  return updateQuery(queryId, { is_draft: false });
}

/**
 * Execute a query and get results
 * For non-parameterized queries, may return cached results.
 * For parameterized queries or when max_age=0, executes fresh.
 * 
 * @param queryId Query ID
 * @param options Execution options (parameters and max_age)
 * @returns Either a job (for async) or query_result (for cached)
 */
export async function executeQuery(
  queryId: number,
  options: QueryExecutionRequest = {}
): Promise<QueryExecutionResponse> {
  return redashFetch<QueryExecutionResponse>(`/api/queries/${queryId}/results`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

/**
 * Get job status for async query execution
 * @param jobId Job ID returned from executeQuery
 */
export async function getJobStatus(jobId: string): Promise<RedashJob> {
  const response = await redashFetch<{ job: RedashJob }>(`/api/jobs/${jobId}`);
  return response.job;
}

/**
 * Poll for job completion with timeout
 * @param jobId Job ID to poll
 * @param pollInterval Interval between polls in ms (default: 1000)
 * @param maxAttempts Maximum number of poll attempts (default: 60)
 */
export async function waitForJob(
  jobId: string,
  pollInterval: number = 1000,
  maxAttempts: number = 60
): Promise<RedashJob> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const job = await getJobStatus(jobId);
    
    // Status 3 = SUCCESS, 4 = FAILURE, 5 = CANCELLED
    if (job.status >= 3) {
      return job;
    }
    
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(
    `Job ${jobId} did not complete within ${maxAttempts * pollInterval / 1000} seconds`
  );
}

/**
 * Get query result by ID
 * @param queryResultId Query result ID
 * @param format Output format (json or csv)
 */
export async function getQueryResult(
  queryResultId: number,
  format: "json" | "csv" = "json"
): Promise<RedashQueryResult | string> {
  const endpoint = `/api/query_results/${queryResultId}${format === "csv" ? ".csv" : ""}`;
  
  if (format === "csv") {
    const config = getConfig();
    const response = await fetch(`${config.url}${endpoint}`, {
      headers: {
        Authorization: `Key ${config.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Redash API error (${response.status}): ${await response.text()}`);
    }
    
    return response.text();
  }
  
  const response = await redashFetch<{ query_result: RedashQueryResult }>(endpoint);
  return response.query_result;
}

/**
 * Helper to execute a query and wait for results
 * Combines executeQuery + waitForJob + getQueryResult
 */
export async function executeQueryAndWait(
  queryId: number,
  options: QueryExecutionRequest = {},
  format: "json" | "csv" = "json"
): Promise<{
  result: RedashQueryResult | string;
  job?: RedashJob;
  fromCache: boolean;
}> {
  const execResponse = await executeQuery(queryId, options);
  
  // If we got a cached result directly
  if (execResponse.query_result) {
    return {
      result: format === "csv" 
        ? await getQueryResult(execResponse.query_result.id, "csv") as string
        : execResponse.query_result,
      fromCache: true,
    };
  }
  
  // If we got a job, wait for it
  if (execResponse.job) {
    const job = await waitForJob(execResponse.job.id);
    
    if (job.status === 4) {
      throw new Error(`Query execution failed: ${job.error || "Unknown error"}`);
    }
    
    if (job.status === 5) {
      throw new Error("Query execution was cancelled");
    }
    
    if (!job.query_result_id) {
      throw new Error("Job completed but no query_result_id returned");
    }
    
    const result = await getQueryResult(job.query_result_id, format);
    return {
      result,
      job,
      fromCache: false,
    };
  }
  
  throw new Error("Unexpected response from Redash API: no job or query_result");
}

/**
 * Get human-readable job status name
 */
export function getJobStatusName(status: JobStatus): string {
  return JOB_STATUS_NAMES[status] || "UNKNOWN";
}

// ============================================
// Dashboard API (Read/Write)
// ============================================

/**
 * List all dashboards with pagination
 * @param page Page number (1-based)
 * @param pageSize Number of results per page
 */
export async function listDashboards(
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedDashboards> {
  return redashFetch<PaginatedDashboards>(
    `/api/dashboards?page=${page}&page_size=${pageSize}`
  );
}

/**
 * Get a dashboard by slug
 * @param slug Dashboard slug
 */
export async function getDashboard(slug: string): Promise<RedashDashboard> {
  return redashFetch<RedashDashboard>(`/api/dashboards/${slug}`);
}

// ============================================
// Data Source API (Read-Only)
// ============================================

/**
 * List all data sources with pagination
 * @param page Page number (1-based)
 * @param pageSize Number of results per page
 */
export async function listDataSources(
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedDataSources> {
  return redashFetch<PaginatedDataSources>(
    `/api/data_sources?page=${page}&page_size=${pageSize}`
  );
}

/**
 * Create a new dashboard
 * @param data Dashboard creation data
 */
export async function createDashboard(
  data: CreateDashboardRequest
): Promise<RedashDashboard> {
  return redashFetch<RedashDashboard>("/api/dashboards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing dashboard
 * @param dashboardId Dashboard ID (not slug)
 * @param data Dashboard update data
 */
export async function updateDashboard(
  dashboardId: number,
  data: UpdateDashboardRequest
): Promise<RedashDashboard> {
  return redashFetch<RedashDashboard>(`/api/dashboards/${dashboardId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Publish a dashboard (mark as non-draft)
 * @param dashboardId Dashboard ID to publish
 */
export async function publishDashboard(
  dashboardId: number
): Promise<RedashDashboard> {
  return updateDashboard(dashboardId, { is_draft: false });
}

// ============================================
// Widget API
// ============================================

/**
 * Create a widget (add visualization to dashboard)
 * @param data Widget creation data
 */
export async function createWidget(
  data: CreateWidgetRequest
): Promise<DashboardWidget> {
  return redashFetch<DashboardWidget>("/api/widgets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing widget
 * @param widgetId Widget ID
 * @param data Widget update data
 */
export async function updateWidget(
  widgetId: number,
  data: UpdateWidgetRequest
): Promise<DashboardWidget> {
  return redashFetch<DashboardWidget>(`/api/widgets/${widgetId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if Redash connection is configured and working
 */
export async function checkConnection(): Promise<{
  connected: boolean;
  url: string;
  error?: string;
}> {
  try {
    const config = getConfig();
    // Try to list queries as a connection test
    await listQueries(1, 1);
    return {
      connected: true,
      url: config.url,
    };
  } catch (error) {
    return {
      connected: false,
      url: process.env.REDASH_URL || "not configured",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

