// Redash API Type Definitions

// ============================================
// Query Types
// ============================================

export interface RedashQuery {
  id: number;
  name: string;
  description: string | null;
  query: string;
  data_source_id: number;
  schedule: QuerySchedule | null;
  is_archived: boolean;
  is_draft: boolean;
  is_safe: boolean;
  updated_at: string;
  created_at: string;
  user: RedashUser;
  last_modified_by: RedashUser | null;
  options: QueryOptions;
  tags: string[];
  api_key: string;
  latest_query_data_id: number | null;
  visualizations: QueryVisualization[];
}

export interface QuerySchedule {
  interval: number;
  time: string | null;
  day_of_week: string | null;
  until: string | null;
}

export interface QueryOptions {
  parameters?: QueryParameter[];
  [key: string]: unknown;
}

export interface QueryParameter {
  name: string;
  title: string;
  type: "text" | "number" | "date" | "datetime-local" | "datetime-with-seconds" | "enum" | "query" | "date-range" | "datetime-range" | "datetime-range-with-seconds";
  value: unknown;
  enumOptions?: string;
  queryId?: number;
  global?: boolean;
}

export interface QueryVisualization {
  id: number;
  type: string;
  name: string;
  description: string | null;
  options: Record<string, unknown>;
  updated_at: string;
  created_at: string;
}

export interface CreateVisualizationRequest {
  name: string;
  type: string;
  query_id: number;
  description?: string | null;
  options?: Record<string, unknown>;
}

export interface PaginatedQueries {
  count: number;
  page: number;
  page_size: number;
  results: RedashQuery[];
}

export interface CreateQueryRequest {
  name: string;
  query: string;
  data_source_id: number;
  description?: string;
  schedule?: QuerySchedule;
  is_draft?: boolean;
  tags?: string[];
  options?: QueryOptions;
}

export interface UpdateQueryRequest {
  name?: string;
  query?: string;
  description?: string;
  schedule?: QuerySchedule | null;
  is_draft?: boolean;
  is_archived?: boolean;
  tags?: string[];
  options?: QueryOptions;
}

// ============================================
// Query Execution Types
// ============================================

export interface QueryExecutionRequest {
  parameters?: Record<string, QueryParameterValue>;
  max_age?: number;
}

export type QueryParameterValue = 
  | string 
  | number 
  | boolean 
  | null 
  | DateRangeValue;

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface QueryExecutionResponse {
  job?: RedashJob;
  query_result?: RedashQueryResult;
}

export interface RedashJob {
  id: string;
  status: JobStatus;
  error?: string;
  query_result_id?: number;
  updated_at: number;
}

export type JobStatus = 1 | 2 | 3 | 4 | 5;
// 1 = PENDING (waiting to be executed)
// 2 = STARTED (executing)
// 3 = SUCCESS
// 4 = FAILURE
// 5 = CANCELLED

export const JOB_STATUS_NAMES: Record<JobStatus, string> = {
  1: "PENDING",
  2: "STARTED",
  3: "SUCCESS",
  4: "FAILURE",
  5: "CANCELLED",
};

export interface RedashQueryResult {
  id: number;
  query_hash: string;
  query: string;
  data: QueryResultData;
  data_source_id: number;
  runtime: number;
  retrieved_at: string;
}

export interface QueryResultData {
  columns: QueryResultColumn[];
  rows: Record<string, unknown>[];
}

export interface QueryResultColumn {
  name: string;
  friendly_name: string;
  type: string;
}

// ============================================
// Dashboard Types
// ============================================

export interface RedashDashboard {
  id: number;
  slug: string;
  name: string;
  user_id: number;
  user: RedashUser;
  layout: unknown[];
  dashboard_filters_enabled: boolean;
  is_archived: boolean;
  is_draft: boolean;
  is_favorite: boolean;
  tags: string[];
  widgets: DashboardWidget[];
  updated_at: string;
  created_at: string;
  version: number;
  can_edit: boolean;
  public_url?: string;
  api_key?: string;
}

export interface DashboardWidget {
  id: number;
  dashboard_id: number;
  text: string;
  visualization?: QueryVisualization & { query: RedashQuery };
  options: WidgetOptions;
  width: number;
  created_at: string;
  updated_at: string;
}

export interface WidgetOptions {
  isHidden?: boolean;
  parameterMappings?: Record<string, unknown>;
  position?: WidgetPosition;
  [key: string]: unknown;
}

export interface WidgetPosition {
  autoHeight?: boolean;
  sizeX?: number;
  sizeY?: number;
  minSizeX?: number;
  maxSizeX?: number;
  minSizeY?: number;
  maxSizeY?: number;
  col?: number;
  row?: number;
}

export interface PaginatedDashboards {
  count: number;
  page: number;
  page_size: number;
  results: RedashDashboard[];
}

export interface CreateDashboardRequest {
  name: string;
  tags?: string[];
}

export interface UpdateDashboardRequest {
  name?: string;
  is_draft?: boolean;
  is_archived?: boolean;
  tags?: string[];
  layout?: unknown[];
  dashboard_filters_enabled?: boolean;
  version?: number;
}

// ============================================
// Widget Types
// ============================================

export interface CreateWidgetRequest {
  dashboard_id: number;
  visualization_id?: number;
  text?: string;
  options?: WidgetOptions;
  width?: number;
}

export interface UpdateWidgetRequest {
  text?: string;
  options?: WidgetOptions;
  width?: number;
}

// ============================================
// User Types
// ============================================

export interface RedashUser {
  id: number;
  name: string;
  email: string;
  profile_image_url?: string;
  groups?: number[];
  updated_at?: string;
  created_at?: string;
  disabled_at?: string | null;
  is_disabled?: boolean;
  active_at?: string;
  is_invitation_pending?: boolean;
  is_email_verified?: boolean;
}

// ============================================
// Data Source Types
// ============================================

export interface RedashDataSource {
  id: number;
  name: string;
  type: string;
  options: Record<string, unknown>;
  scheduled_queue_name?: string;
  queue_name?: string;
  syntax?: string;
  paused?: number;
  paused_reason?: string | null;
  view_only?: boolean;
  created_at: string;
  updated_at: string;
  user?: RedashUser;
}

export interface PaginatedDataSources {
  count: number;
  page: number;
  page_size: number;
  results: RedashDataSource[];
}

// ============================================
// API Response Types
// ============================================

export interface RedashApiError {
  message: string;
  error_type?: string;
}

export interface RedashConfig {
  url: string;
  apiKey: string;
}

