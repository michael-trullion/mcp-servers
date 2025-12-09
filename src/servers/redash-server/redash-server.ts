import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import * as RedashAPI from "./redash-api.js";
import { QueryParameterValue } from "./types.js";

// Load environment variables
config();

const normalizeEnv = (
  value?: string
): { canonical?: string; normalizedFrom?: string } => {
  if (!value) return { canonical: undefined, normalizedFrom: undefined };

  const trimmed = value.trim();
  if (!trimmed) return { canonical: undefined, normalizedFrom: undefined };

  return { canonical: trimmed, normalizedFrom: undefined };
};

// Create an MCP server
const server = new McpServer({
  name: "Redash Server",
  version: "1.0.0",
});

// ============================================
// Prompt Templates
// ============================================

server.prompt(
  "redash_query_planner",
  {
    goal: z
      .string()
      .optional()
      .describe("User goal or question for the query/dashboard"),
    env: z
      .string()
      .optional()
      .describe(
        "Target environment; normalized to closest match (case-insensitive) or inferred if missing"
      ),
    databases: z
      .string()
      .optional()
      .describe(
        "Databases or data sources (comma-separated). If missing, infer from env/prefix and goal."
      ),
    widgets: z
      .string()
      .optional()
      .describe("Preferred widgets/visualizations (comma-separated)."),
    notes: z
      .string()
      .optional()
      .describe("Extra user constraints, filters, or sorting preferences"),
  },
  ({ goal, env, databases, widgets, notes }) => {
    const toList = (value?: string) =>
      value
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const dbList = toList(databases);
    const widgetList = toList(widgets);

    const envResult = normalizeEnv(env);
    const envLine = envResult.canonical
      ? `Env: ${envResult.canonical} (locked${
          envResult.normalizedFrom
            ? `; normalized from "${envResult.normalizedFrom}"`
            : ""
        }).`
      : env
      ? `Env provided: ${env} (unrecognized; I'll infer and pick the closest match).`
      : "Env? I can infer and choose the closest match (case-insensitive).";
    const dbLine = dbList?.length
      ? `Databases/data sources: ${dbList.join(", ")} (locked).`
      : "Databases/data sources? If unknown I'll infer by env/prefix and explore schemas.";
    const widgetLine = widgetList?.length
      ? `Widgets: ${widgetList.join(", ")} (prefer these).`
      : "Widgets? table/counter/line/bar/pie/etc. If none, I'll propose.";
    const goalLine = goal
      ? `Goal: ${goal}.`
      : "Goal/question? What do you need to know or build?";
    const notesLine = notes
      ? `Notes: ${notes}.`
      : "Any filters/time range/joins/sorting? Your instructions override mine.";

    const promptBody = [
      "Redash assistant for queries/dashboards. I stay concise and transparent; your inputs override defaults.",
      goalLine,
      envLine,
      dbLine,
      widgetLine,
      notesLine,
      "Env handling: case-insensitive; I'll choose the closest match if the value is approximate.",
      "Data selection: pick only data sources/tables/columns you can actually see or infer from schema inspection; avoid guessing unseen fields. If unsure, explore schema first, then propose.",
      "Plan I'll share: map env→data sources (by prefix), gather tables/filters/time, explore schemas if unsure, draft SQL + params, propose dashboard/widgets/layout.",
      "Query hygiene: do NOT create multiple temp queries; reuse/update a single scratch query if one is required instead of creating new ones.",
      "Answer now: 1) env? 2) data sources/DBs? 3) goal/time/filter/joins? 4) widgets? 5) other constraints? If unsure, I'll explore and complete.",
    ].join("\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptBody,
          },
        },
      ],
    };
  }
);

server.prompt(
  "redash_dashboard_planner",
  {
    name: z
      .string()
      .optional()
      .describe("Dashboard name/title"),
    env: z
      .string()
      .optional()
      .describe(
        "Target environment; normalized to closest match (case-insensitive) or inferred if missing"
      ),
    data_sources: z
      .string()
      .optional()
      .describe("Data sources or DBs (comma-separated); inferred if missing"),
    widgets: z
      .string()
      .optional()
      .describe("Preferred widgets/layout blocks (comma-separated)"),
    goal: z
      .string()
      .optional()
      .describe("Business question(s) to answer"),
    filters: z
      .string()
      .optional()
      .describe("Key filters/time ranges/segments (comma-separated)"),
    notes: z
      .string()
      .optional()
      .describe("Other constraints; user instructions override defaults"),
  },
  ({ name, env, data_sources, widgets, goal, filters, notes }) => {
    const toList = (value?: string) =>
      value
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const dsList = toList(data_sources);
    const widgetList = toList(widgets);
    const filterList = toList(filters);

    const envResult = normalizeEnv(env);
    const envLine = envResult.canonical
      ? `Env: ${envResult.canonical} (locked${
          envResult.normalizedFrom
            ? `; normalized from "${envResult.normalizedFrom}"`
            : ""
        }).`
      : env
      ? `Env provided: ${env} (unrecognized; I'll infer and pick the closest match).`
      : "Env? I can infer and choose the closest match (case-insensitive).";
    const dsLine = dsList?.length
      ? `Data sources: ${dsList.join(", ")} (locked).`
      : "Data sources? If unknown I'll infer by env/prefix and explore schemas.";
    const widgetLine = widgetList?.length
      ? `Widgets/layout: ${widgetList.join(", ")} (prefer these).`
      : "Widgets/layout? table/counter/line/bar/pie/text/maps. If none, I'll propose.";
    const goalLine = goal
      ? `Goal: ${goal}.`
      : "Goal? What should this dashboard answer?";
    const filterLine = filterList?.length
      ? `Filters/time/segments: ${filterList.join(", ")}.`
      : "Filters/time/segments? If none, I'll propose sensible defaults.";
    const notesLine = notes
      ? `Notes: ${notes}.`
      : "Any joins/grouping/sorting/owners/refresh cadence? Your instructions override defaults.";
    const nameLine = name ? `Name: ${name} (locked).` : "Name? I can propose.";

    const promptBody = [
      "Redash dashboard assistant. I stay concise and transparent; your inputs override defaults.",
      nameLine,
      goalLine,
      envLine,
      dsLine,
      widgetLine,
      filterLine,
      notesLine,
      "Env handling: case-insensitive; I'll choose the closest match if the value is approximate.",
      "Data selection: choose only data sources/tables/columns you can actually access or confirm via schema exploration; avoid guessing unseen fields. Explore schema first when unsure, then propose queries and visuals accordingly.",
      "",
      "Tooling available: use describe_visualization_options(type) to see required/optional option keys before creating a visualization. Use it plus query columns to build explicit options (e.g., columnMapping or counterColName).",
      "",
      "CRITICAL: Before creating any visualizations, inspect existing published dashboards (list_dashboards, get_dashboard) to learn successful patterns: widget sizes, layout positions, visualization types, and column mappings. Reuse these patterns when possible.",
      "",
      "Visualization column mapping (REQUIRED):",
      "- For COUNTER widgets: MUST use 'counterColName' option (not 'colName'). Example: {counterColName: 'total_uploads', rowNumber: 0, format: '0,0', text: 'Uploads'}. Missing counterColName causes blank displays.",
      "- For CHART widgets: MUST explicitly map columns using 'columnMapping' with x/y/series keys. Example: {columnMapping: {day: 'x', uploads: 'y', company: 'series'}}. Never rely on automatic column detection.",
      "- For all visualizations: explicitly name which query columns map to which visualization dimensions. Reference Redash API docs for exact option structures.",
      "",
      "Widget sizing heuristics (use existing dashboards to validate):",
      "- KPI/COUNTER widgets: typically 2x2 grid units (sizeX: 2, sizeY: 2). Place in top row (row: 0), side-by-side.",
      "- Time series charts (LINE/AREA): typically 6x4 or 8x4 (sizeX: 6-8, sizeY: 4). Full-width charts can be 12x4.",
      "- Categorical charts (BAR/STACKED): typically 6x4 or 8x4. Stacked bars for multi-series comparisons.",
      "- PIE charts: smaller, typically 4x4, only for small categorical splits (<10 categories).",
      "- Position widgets sequentially: row 0 for KPIs, row 2+ for charts, incrementing by widget height + 1.",
      "",
      "Visualization type selection (best-fit rule):",
      "- Time trends: LINE or AREA charts (not table). Use dual-axis for mixed metrics (e.g., count + percentage).",
      "- Rankings/comparisons: BAR (horizontal for long labels) or STACKED BAR for multi-dimensional splits.",
      "- Status splits: STACKED BAR or PIE (if <10 categories).",
      "- Single metrics: COUNTER/KPI widgets (not table cells).",
      "- Duration/latency distributions: LINE chart with percentiles (p50/p90/p99) or BOX plot if available.",
      "- Table: ONLY as fallback when no other visualization fits, or when explicitly requested. Prefer structured charts.",
      "",
      "Query hygiene: avoid creating multiple temp queries; reuse/update a single scratch query if execution requires one—do not create new queries per run.",
      "",
      "Execution guardrails:",
      "- Add widgets sequentially (one-by-one) with explicit position/size; avoid parallel add_widget calls to prevent Redash 500s.",
      "- Execute or validate queries before placing them; if a query fails or is missing data, do NOT add its widget until it works.",
      "- Always specify explicit widget positions: {position: {col: 0, row: 0, sizeX: 2, sizeY: 2}} to prevent layout conflicts.",
      "",
      "Answer now: 1) name? 2) env? 3) data sources/DBs? 4) goal? 5) widgets/layout? 6) filters/time/segments? 7) other constraints? If unsure, I'll explore and complete.",
    ].join("\n");

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptBody,
          },
        },
      ],
    };
  }
);

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

// Fork query tool
server.tool(
  "fork_query",
  {
    query_id: z
      .number()
      .describe("The ID of the query to fork/duplicate"),
  },
  async ({ query_id }) => {
    try {
      const forkedQuery = await RedashAPI.forkQuery(query_id);
      return {
        content: [
          {
            type: "text",
            text: `Successfully forked query. New query: "${forkedQuery.name}" (ID: ${forkedQuery.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(forkedQuery, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in fork_query handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error forking query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Create query tool
server.tool(
  "create_query",
  {
    name: z.string().describe("Name for the new query"),
    query: z.string().describe("The SQL query to execute"),
    data_source_id: z
      .number()
      .describe("The ID of the data source to run the query against"),
    description: z
      .string()
      .optional()
      .describe("Optional description for the query"),
    is_draft: z
      .boolean()
      .optional()
      .describe("Whether the query is a draft (default: true)"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Optional tags for the query"),
  },
  async ({ name, query, data_source_id, description, is_draft, tags }) => {
    try {
      const newQuery = await RedashAPI.createQuery({
        name,
        query,
        data_source_id,
        description,
        is_draft,
        tags,
      });
      return {
        content: [
          {
            type: "text",
            text: `Successfully created query "${newQuery.name}" (ID: ${newQuery.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(newQuery, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in create_query handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Update query tool
server.tool(
  "update_query",
  {
    query_id: z.number().describe("The ID of the query to update"),
    name: z.string().optional().describe("New name for the query"),
    query: z.string().optional().describe("New SQL query"),
    description: z
      .string()
      .optional()
      .describe("New description for the query"),
    is_draft: z
      .boolean()
      .optional()
      .describe("Set draft status of the query"),
    is_archived: z
      .boolean()
      .optional()
      .describe("Set archived status of the query"),
    tags: z
      .array(z.string())
      .optional()
      .describe("New tags for the query"),
  },
  async ({ query_id, name, query, description, is_draft, is_archived, tags }) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (query !== undefined) updateData.query = query;
      if (description !== undefined) updateData.description = description;
      if (is_draft !== undefined) updateData.is_draft = is_draft;
      if (is_archived !== undefined) updateData.is_archived = is_archived;
      if (tags !== undefined) updateData.tags = tags;

      const updatedQuery = await RedashAPI.updateQuery(query_id, updateData);
      return {
        content: [
          {
            type: "text",
            text: `Successfully updated query "${updatedQuery.name}" (ID: ${updatedQuery.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(updatedQuery, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in update_query handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error updating query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Lightweight option "schemas" to guide LLMs (not enforced here)
const visualizationOptionGuides: Record<string, Record<string, unknown>> = {
  COUNTER: {
    required: ["counterColName"],
    optional: ["rowNumber", "format", "text", "stringDecimalFormat", "suffix"],
    notes:
      "Set counterColName (or counterValueColumn). rowNumber default 0. Format like 0,0 or 0.0%.",
  },
  CHART: {
    required: ["columnMapping"],
    optional: [
      "globalSeriesType",
      "series",
      "xAxis",
      "yAxis",
      "legend",
      "stacking",
      "sortX",
    ],
    notes:
      "columnMapping must bind columns to roles: { colX: 'x', colY: 'y', optionalSeries: 'series' }. globalSeriesType examples: line, area, column.",
  },
  PIVOT: {
    required: ["rows", "values"],
    optional: ["columns", "aggregator", "numberFormat"],
    notes:
      "rows/columns/values are arrays of column names. aggregator examples: sum, avg, count.",
  },
  TABLE: {
    required: [],
    optional: ["columns", "order", "filters"],
    notes: "Table typically needs no options; columns can control visibility/order.",
  },
  BOXPLOT: {
    required: ["x", "y"],
    optional: [],
    notes: "x = category/group (string), y = numeric column.",
  },
  HEATMAP: {
    required: ["xAxis", "yAxis", "valueColumn"],
    optional: [],
    notes: "xAxis/yAxis are dimension columns; valueColumn is numeric.",
  },
  WORD_CLOUD: {
    required: ["series", "valueColumn"],
    optional: [],
    notes: "series = term column (string), valueColumn = numeric weight.",
  },
  SANKEY: {
    required: ["sourceColumn", "targetColumn", "valueColumn"],
    optional: [],
    notes: "Columns for source, target, and numeric value/weight.",
  },
  COHORT: {
    required: ["timeColumn", "groupColumn", "valueColumn"],
    optional: [],
    notes: "timeColumn (date), groupColumn (string), valueColumn (numeric).",
  },
  FUNNEL: {
    required: ["stageColumn", "valueColumn"],
    optional: [],
    notes: "stageColumn (string), valueColumn (numeric counts).",
  },
};

// Apply light-touch default number/percent formatting so visualizations render with human-friendly units.
// This is conservative: only fills defaults when users did not provide them.
const applyDefaultFormatting = (
  type: string,
  options?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!options || typeof options !== "object") return options;

  const cloned: Record<string, unknown> = { ...options };
  const toStr = (value: unknown) => (typeof value === "string" ? value : "");
  const isPercentColumn = (col: string) => /pct|percent/i.test(col);
  const isDurationColumn = (col: string) =>
    /duration|latency|time|sec|ms/i.test(col);

  const upperType = type.toUpperCase();

  if (upperType === "COUNTER") {
    const colName = toStr(cloned.counterColName);
    if (colName) {
      if (isPercentColumn(colName)) {
        cloned.stringSuffix ??= "%";
        cloned.stringDecimal ??= 1;
        cloned.tooltipFormat ??= "0,0.0";
      } else if (isDurationColumn(colName)) {
        cloned.stringSuffix ??= " s";
        cloned.stringDecimal ??= 2;
        cloned.tooltipFormat ??= "0,0.00";
      }
    }
    cloned.stringThouSep ??= ",";
  }

  if (upperType === "CHART") {
    cloned.numberFormat ??= "0,0.[00]";
    const mapping = cloned.columnMapping as Record<string, string> | undefined;
    if (mapping) {
      const yCols = Object.entries(mapping)
        .filter(([, role]) => role === "y")
        .map(([col]) => col);
      const hasPctY = yCols.some(isPercentColumn);
      if (hasPctY) {
        cloned.numberFormat ??= "0,0.0%";
        cloned.percentFormat ??= "0,0.0%";
      }
    }
  }

  return cloned;
};

// Describe visualization options (guidance only; no enforcement)
server.tool(
  "describe_visualization_options",
  {
    type: z.string().describe("Visualization type (e.g., COUNTER, CHART, PIVOT)"),
  },
  async ({ type }) => {
    const key = type.toUpperCase();
    const schema = visualizationOptionGuides[key];
    if (!schema) {
      return {
        content: [
          {
            type: "text",
            text: `No predefined guidance for type "${type}". Supported: ${Object.keys(
              visualizationOptionGuides
            ).join(", ")}. For custom/plugin types, inspect existing visualizations via get_visualization.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `Options guidance for ${key}: ${JSON.stringify(schema, null, 2)}`,
        },
      ],
    };
  }
);

// Create visualization tool
server.tool(
  "create_visualization",
  {
    query_id: z.number().describe("The ID of the query to attach the visualization to"),
    name: z.string().describe("Name for the visualization"),
    type: z
      .string()
      .describe(
        "Visualization type (e.g., TABLE, CHART, COUNTER, PIE, LINE). Use describe_visualization_options(type) for expected option keys."
      ),
    description: z.string().optional().describe("Optional description"),
    options: z
      .record(z.unknown())
      .optional()
      .describe(
        "Visualization options/config as JSON. Include explicit mappings (e.g., counterColName, columnMapping). See describe_visualization_options(type)."
      ),
  },
  async ({ query_id, name, type, description, options }) => {
    try {
      const normalizedOptions = applyDefaultFormatting(type, options);
      const visualization = await RedashAPI.createVisualization({
        query_id,
        name,
        type,
        description,
        options: normalizedOptions,
      });

      return {
        content: [
          {
            type: "text",
            text: `Successfully created visualization "${visualization.name}" (ID: ${visualization.id}) on query ${query_id}.`,
          },
          {
            type: "text",
            text: JSON.stringify(visualization, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in create_visualization handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error creating visualization: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Publish query tool (set is_draft=false)
server.tool(
  "publish_query",
  {
    query_id: z
      .number()
      .describe("The ID of the query to publish (set is_draft to false)"),
  },
  async ({ query_id }) => {
    try {
      const publishedQuery = await RedashAPI.publishQuery(query_id);
      const statusText = publishedQuery.is_draft ? "draft" : "published";

      return {
        content: [
          {
            type: "text",
            text: `Query "${publishedQuery.name}" (ID: ${publishedQuery.id}) is now ${statusText}.`,
          },
          {
            type: "text",
            text: JSON.stringify(publishedQuery, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in publish_query handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error publishing query: ${
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
// Data Source Tools (Read-Only)
// ============================================

// List data sources tool
server.tool(
  "list_data_sources",
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
      const dataSources = await RedashAPI.listDataSources(page, page_size);
      return {
        content: [
          {
            type: "text",
            text: `Found ${dataSources.count} data sources (showing page ${page} of ${Math.ceil(dataSources.count / page_size)}).`,
          },
          {
            type: "text",
            text: JSON.stringify(dataSources, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in list_data_sources handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing data sources: ${
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

// Publish dashboard tool (set is_draft=false)
server.tool(
  "publish_dashboard",
  {
    dashboard_id: z
      .number()
      .describe("The dashboard ID to publish (set is_draft to false)"),
  },
  async ({ dashboard_id }) => {
    try {
      const dashboard = await RedashAPI.publishDashboard(dashboard_id);
      const statusText = dashboard.is_draft ? "draft" : "published";

      return {
        content: [
          {
            type: "text",
            text: `Dashboard "${dashboard.name}" (ID: ${dashboard.id}) is now ${statusText}.`,
          },
          {
            type: "text",
            text: JSON.stringify(dashboard, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in publish_dashboard handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error publishing dashboard: ${
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
// Widget Tools
// ============================================

// Add widget to dashboard tool
server.tool(
  "add_widget_to_dashboard",
  {
    dashboard_id: z
      .number()
      .describe("The ID of the dashboard to add the widget to"),
    visualization_id: z
      .number()
      .optional()
      .describe(
        "The visualization ID to add (from an existing query). Required unless adding a text widget."
      ),
    text: z
      .string()
      .optional()
      .describe("Text content for a text widget (use instead of visualization_id)"),
    width: z
      .number()
      .optional()
      .describe("Widget width in grid units (default: 1)"),
    options: z
      .object({
        position: z
          .object({
            col: z.number().describe("Column position (0-based)"),
            row: z.number().describe("Row position (0-based)"),
            sizeX: z.number().describe("Width in grid units"),
            sizeY: z.number().describe("Height in grid units"),
          })
          .optional()
          .describe("Widget position on the dashboard grid"),
      })
      .optional()
      .describe("Widget display options"),
  },
  async ({ dashboard_id, visualization_id, text, width, options }) => {
    try {
      if (!visualization_id && !text) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Either visualization_id or text must be provided",
            },
          ],
          isError: true,
        };
      }

    // Redash can 500 if width/options are missing; provide safe defaults
    const safeWidth = width ?? 1;
    const safeOptions =
      options ?? {
        parameterMappings: {},
        position: { autoHeight: true },
      };

    const widget = await RedashAPI.createWidget({
      dashboard_id,
      visualization_id,
      text,
      width: safeWidth,
      options: safeOptions,
    });

      const widgetType = visualization_id ? "visualization" : "text";
      return {
        content: [
          {
            type: "text",
            text: `Successfully added ${widgetType} widget to dashboard (Widget ID: ${widget.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(widget, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in add_widget_to_dashboard handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error adding widget: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Update widget tool
server.tool(
  "update_widget",
  {
    widget_id: z.number().describe("The ID of the widget to update"),
    text: z
      .string()
      .optional()
      .describe("New text content (for text widgets only)"),
    width: z.number().optional().describe("New widget width in grid units"),
    options: z
      .object({
        position: z
          .object({
            col: z.number().optional().describe("Column position (0-based)"),
            row: z.number().optional().describe("Row position (0-based)"),
            sizeX: z.number().optional().describe("Width in grid units"),
            sizeY: z.number().optional().describe("Height in grid units"),
          })
          .optional()
          .describe("Widget position on the dashboard grid"),
      })
      .optional()
      .describe("Widget display options"),
  },
  async ({ widget_id, text, width, options }) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (text !== undefined) updateData.text = text;
      if (width !== undefined) updateData.width = width;
      if (options !== undefined) updateData.options = options;

      const widget = await RedashAPI.updateWidget(widget_id, updateData);
      return {
        content: [
          {
            type: "text",
            text: `Successfully updated widget (ID: ${widget.id})`,
          },
          {
            type: "text",
            text: JSON.stringify(widget, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in update_widget handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error updating widget: ${
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
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}

export default server;

