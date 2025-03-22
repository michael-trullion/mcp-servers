import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

// Load environment variables
config();

// Flag to track if we're in demo mode (no real DB connection)
let demoMode = false;

// Define interfaces for our demo data
interface DemoUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

interface DemoProduct {
  id: number;
  name: string;
  price: number;
  created_at: string;
}

interface DemoResult {
  rows: any[];
  rowCount: number;
}

// Create the PostgreSQL pool with a connection timeout
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "postgres",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "",
  ssl:
    process.env.POSTGRES_SSL_MODE === "require"
      ? { rejectUnauthorized: false }
      : undefined,
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "10"),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // 5 second timeout
});

// Add error handler
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

// Create an MCP server
const server = new McpServer({
  name: "PostgreSQL Server",
  version: "1.0.0",
});

// Get database info tool
server.tool("mcp__get_database_info", {}, async () => {
  if (demoMode) {
    return {
      content: [
        {
          type: "text",
          text: "Running in demo mode - no actual PostgreSQL connection.",
        },
        {
          type: "text",
          text: JSON.stringify(
            {
              database_name: "demo_database",
              current_user: "demo_user",
              postgresql_version: "PostgreSQL 14.0 (Demo Version)",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    const result = await pool.query(`
      SELECT current_database() as database_name, 
             current_user as current_user,
             version() as postgresql_version
    `);

    return {
      content: [
        {
          type: "text",
          text: `Connected to database: ${result.rows[0].database_name} as ${result.rows[0].current_user}`,
        },
        {
          type: "text",
          text: JSON.stringify(result.rows[0], null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting database info:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error getting database info: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// List tables tool
server.tool("mcp__list_tables", {}, async () => {
  if (demoMode) {
    return {
      content: [
        {
          type: "text",
          text: "Running in demo mode - showing sample tables.",
        },
        {
          type: "text",
          text: JSON.stringify(
            [
              {
                table_name: "users",
                table_schema: "public",
                table_type: "BASE TABLE",
              },
              {
                table_name: "products",
                table_schema: "public",
                table_type: "BASE TABLE",
              },
              {
                table_name: "orders",
                table_schema: "public",
                table_type: "BASE TABLE",
              },
            ],
            null,
            2
          ),
        },
      ],
    };
  }

  try {
    const result = await pool.query(`
      SELECT 
        table_name, 
        table_schema,
        table_type
      FROM 
        information_schema.tables
      WHERE 
        table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY 
        table_schema, table_name
    `);

    return {
      content: [
        {
          type: "text",
          text: `Found ${result.rows.length} tables.`,
        },
        {
          type: "text",
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error listing tables:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error listing tables: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Get table structure tool
server.tool(
  "mcp__get_table_structure",
  {
    table_name: z.string().describe("The name of the table to examine"),
  },
  async ({ table_name }) => {
    if (demoMode) {
      // Return different demo data based on the requested table
      let columns = [];
      if (table_name === "users") {
        columns = [
          {
            column_name: "id",
            data_type: "integer",
            is_nullable: "NO",
            column_default: "nextval('users_id_seq'::regclass)",
          },
          {
            column_name: "username",
            data_type: "character varying",
            is_nullable: "NO",
            column_default: null,
          },
          {
            column_name: "email",
            data_type: "character varying",
            is_nullable: "NO",
            column_default: null,
          },
          {
            column_name: "created_at",
            data_type: "timestamp",
            is_nullable: "NO",
            column_default: "CURRENT_TIMESTAMP",
          },
        ];
      } else if (table_name === "products") {
        columns = [
          {
            column_name: "id",
            data_type: "integer",
            is_nullable: "NO",
            column_default: "nextval('products_id_seq'::regclass)",
          },
          {
            column_name: "name",
            data_type: "character varying",
            is_nullable: "NO",
            column_default: null,
          },
          {
            column_name: "price",
            data_type: "numeric",
            is_nullable: "NO",
            column_default: null,
          },
          {
            column_name: "created_at",
            data_type: "timestamp",
            is_nullable: "NO",
            column_default: "CURRENT_TIMESTAMP",
          },
        ];
      } else {
        columns = [
          {
            column_name: "id",
            data_type: "integer",
            is_nullable: "NO",
            column_default: "nextval('table_id_seq'::regclass)",
          },
          {
            column_name: "name",
            data_type: "character varying",
            is_nullable: "NO",
            column_default: null,
          },
          {
            column_name: "created_at",
            data_type: "timestamp",
            is_nullable: "NO",
            column_default: "CURRENT_TIMESTAMP",
          },
        ];
      }

      return {
        content: [
          {
            type: "text",
            text: `Demo structure for table ${table_name}: ${columns.length} columns found.`,
          },
          {
            type: "text",
            text: JSON.stringify(columns, null, 2),
          },
        ],
      };
    }

    try {
      const result = await pool.query(
        `
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM 
          information_schema.columns
        WHERE 
          table_name = $1
        ORDER BY 
          ordinal_position
      `,
        [table_name]
      );

      return {
        content: [
          {
            type: "text",
            text: `Structure for table ${table_name}: ${result.rows.length} columns found.`,
          },
          {
            type: "text",
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`Error getting structure for table ${table_name}:`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error getting table structure: ${
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
  "mcp__execute_query",
  {
    query: z.string().describe("The SQL query to execute"),
    params: z
      .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Optional parameters for the query"),
  },
  async ({ query, params }) => {
    if (demoMode) {
      // In demo mode, generate some fake results based on the query
      const lowerQuery = query.toLowerCase();
      let demoResult: DemoResult = { rows: [], rowCount: 0 };

      if (lowerQuery.includes("select") && lowerQuery.includes("users")) {
        const users: DemoUser[] = [
          {
            id: 1,
            username: "john_doe",
            email: "john@example.com",
            created_at: "2023-01-01T00:00:00Z",
          },
          {
            id: 2,
            username: "jane_smith",
            email: "jane@example.com",
            created_at: "2023-01-02T00:00:00Z",
          },
        ];
        demoResult.rows = users;
        demoResult.rowCount = 2;
      } else if (
        lowerQuery.includes("select") &&
        lowerQuery.includes("products")
      ) {
        const products: DemoProduct[] = [
          {
            id: 1,
            name: "Product A",
            price: 19.99,
            created_at: "2023-01-01T00:00:00Z",
          },
          {
            id: 2,
            name: "Product B",
            price: 29.99,
            created_at: "2023-01-02T00:00:00Z",
          },
          {
            id: 3,
            name: "Product C",
            price: 39.99,
            created_at: "2023-01-03T00:00:00Z",
          },
        ];
        demoResult.rows = products;
        demoResult.rowCount = 3;
      } else if (
        lowerQuery.includes("insert") ||
        lowerQuery.includes("update") ||
        lowerQuery.includes("delete")
      ) {
        demoResult.rowCount = 1;
      }

      return {
        content: [
          {
            type: "text",
            text: `Demo query executed successfully. Rows affected: ${demoResult.rowCount}`,
          },
          {
            type: "text",
            text: JSON.stringify(
              {
                rows: demoResult.rows,
                rowCount: demoResult.rowCount,
                fields:
                  demoResult.rows.length > 0
                    ? Object.keys(demoResult.rows[0]).map((name) => ({
                        name,
                        dataTypeID: 0,
                      }))
                    : [],
              },
              null,
              2
            ),
          },
        ],
      };
    }

    try {
      const result = await pool.query(query, params);

      const resultData = {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields
          ? result.fields.map((f) => ({
              name: f.name,
              dataTypeID: f.dataTypeID,
            }))
          : [],
      };

      return {
        content: [
          {
            type: "text",
            text: `Query executed successfully. Rows affected: ${result.rowCount}`,
          },
          {
            type: "text",
            text: JSON.stringify(resultData, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error executing query:", error);
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

// Handle termination signals
process.on("SIGINT", async () => {
  console.log("Received SIGINT signal. Shutting down...");
  if (!demoMode) {
    await pool.end();
    console.log("PostgreSQL connection pool closed");
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM signal. Shutting down...");
  if (!demoMode) {
    await pool.end();
    console.log("PostgreSQL connection pool closed");
  }
  process.exit(0);
});

// Start the server
async function startServer() {
  try {
    // Validate environment variables, but don't error out if missing
    const requiredEnvVars = [
      "POSTGRES_DB",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      console.warn(
        `Warning: Missing environment variables: ${missingEnvVars.join(", ")}`
      );
      console.warn(
        "The server will run in demo mode without connecting to a real database."
      );
      demoMode = true;
    } else {
      // Test the connection
      try {
        const client = await pool.connect();
        console.log("Successfully connected to PostgreSQL");
        client.release();
      } catch (error) {
        console.warn("Failed to connect to PostgreSQL:", error);
        console.warn(
          "The server will run in demo mode without a real database connection."
        );
        demoMode = true;
      }
    }

    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log(
      `PostgreSQL Server started in ${
        demoMode ? "DEMO" : "PRODUCTION"
      } mode and ready to process requests`
    );
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
