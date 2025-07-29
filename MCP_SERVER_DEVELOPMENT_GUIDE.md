# MCP Server Development Guide

This guide provides comprehensive rules and best practices for building Model Context Protocol (MCP) servers, based on analysis of existing implementations in this project.

## Table of Contents

1. [Core Architecture Patterns](#core-architecture-patterns)
2. [Project Structure Requirements](#project-structure-requirements)
3. [Implementation Patterns](#implementation-patterns)
4. [Tool Development Guidelines](#tool-development-guidelines)
5. [Configuration and Environment](#configuration-and-environment)
6. [Error Handling Standards](#error-handling-standards)
7. [Documentation Requirements](#documentation-requirements)
8. [Testing and Deployment](#testing-and-deployment)
9. [Integration and Automation](#integration-and-automation)
10. [Advanced Patterns](#advanced-patterns)

## Core Architecture Patterns

### 1. MCP Server Foundation

Every MCP server MUST follow this core structure:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "Your Server Name",
  version: "1.0.0",
});

// Define tools using zod for validation
server.tool(
  "tool_name",
  {
    param1: z.string().describe("Parameter description"),
    param2: z.number().optional().describe("Optional parameter"),
  },
  async ({ param1, param2 }) => {
    // Tool implementation
    return {
      content: [
        { type: "text", text: "Human-readable response" },
        { type: "text", text: JSON.stringify(data, null, 2) },
      ],
    };
  }
);

// Server lifecycle management
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server started and ready to process requests");
}

// Export for testing and import
export default server;

// Start if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}
```

### 2. Response Format Standards

**CRITICAL**: MCP servers must return responses in exact format:

```typescript
// Standard successful response
return {
  content: [
    { type: "text", text: "Human-readable summary" },
    { type: "text", text: JSON.stringify(structuredData, null, 2) },
  ],
};

// Error response
return {
  content: [{ type: "text", text: `Error: ${errorMessage}` }],
  isError: true,
};
```

**DO NOT**:

- Use unsupported content types like `type: "json"`
- Return raw objects without text wrapper
- Mix different response formats

## Project Structure Requirements

### 1. Directory Structure

```
src/servers/your-server/
├── index.ts                    # Server entry point
├── your-server.ts             # Main server implementation
├── your-server-api.ts         # External API/logic layer (if needed)
├── types.ts                   # TypeScript type definitions
├── README.md                  # Server-specific documentation
└── test/                      # Server-specific tests
```

### 2. Naming Conventions

- **Server directory**: `kebab-case` (e.g., `postgres-server`, `pdf-server`)
- **Main file**: `{server-name}.ts` (e.g., `postgres-server.ts`)
- **Tool names**: `snake_case` with optional prefix (e.g., `mcp__get_data`, `execute_command`)
- **Parameters**: `snake_case` (e.g., `table_name`, `namespace`)

### 3. File Requirements

**Every server MUST have**:

- Main server file with export default
- TypeScript types file
- README.md with tool documentation
- Entry in `src/index.ts` and `src/run-all.ts`

## Implementation Patterns

### 1. Parameter Validation with Zod

```typescript
// Required parameter
param_name: z.string().describe("Clear description of what this parameter does"),

// Optional parameter with default
namespace: z.string().optional().describe("Kubernetes namespace (default: local)"),

// Complex object parameter
content: z.object({
  text: z.string().optional(),
  formFields: z.record(z.string()).optional(),
}).describe("Content structure"),

// Array parameter
params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .optional()
  .describe("Query parameters"),
```

### 2. Configuration Management

**Environment Variables Pattern**:

```typescript
import { config } from "dotenv";
config(); // Load .env file

// Define configuration with defaults
const config = {
  host: process.env.SERVICE_HOST || "localhost",
  port: parseInt(process.env.SERVICE_PORT || "5432"),
  database: process.env.SERVICE_DB || "default_db",
  maxConnections: parseInt(process.env.SERVICE_MAX_CONNECTIONS || "10"),
  sslMode: process.env.SERVICE_SSL_MODE === "require",
};
```

**Demo Mode Pattern** (for servers that require external services):

```typescript
let demoMode = false;

// Check for required environment variables
const requiredEnvVars = ["SERVICE_DB", "SERVICE_USER", "SERVICE_PASSWORD"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  console.warn("Running in demo mode with mock data.");
  demoMode = true;
}
```

### 3. External Service Integration

**Separate API Layer Pattern**:

```typescript
// your-server-api.ts
export class YourServiceAPI {
  async getData(params): Promise<ResultType> {
    // External service logic
  }
}

// your-server.ts
import * as YourAPI from "./your-server-api.js";

server.tool("get_data", schema, async (params) => {
  try {
    const result = await YourAPI.getData(params);
    return formatResponse(result);
  } catch (error) {
    return handleError(error);
  }
});
```

## Tool Development Guidelines

### 1. Tool Naming Strategy

**Categories of tools**:

- **Read operations**: `get_*`, `list_*`, `find_*`
- **Write operations**: `create_*`, `update_*`, `delete_*`, `execute_*`
- **Utility operations**: `convert_*`, `parse_*`, `validate_*`

**Examples**:

- `mcp__get_database_info` (namespaced with mcp\_\_)
- `get_pods` (generic name)
- `execute_query` (action-oriented)

### 2. Parameter Design

**Best Practices**:

- Use descriptive parameter names
- Provide clear descriptions for all parameters
- Use optional parameters with sensible defaults
- Group related parameters into objects
- Validate parameter combinations in the handler

```typescript
// Good parameter design
server.tool(
  "execute_command",
  {
    pod_name: z
      .string()
      .describe("Name of the pod where command will be executed"),
    command: z.string().describe("Shell command to execute (e.g., 'ls -la')"),
    container_name: z
      .string()
      .optional()
      .describe("Container name (required for multi-container pods)"),
    namespace: z
      .string()
      .optional()
      .describe("Kubernetes namespace (default: 'local')"),
    timeout_seconds: z
      .number()
      .optional()
      .describe("Command timeout in seconds (default: 30)"),
  },
  async ({
    pod_name,
    command,
    container_name,
    namespace = "local",
    timeout_seconds = 30,
  }) => {
    // Implementation
  }
);
```

### 3. Response Design

**Multi-part responses for complex data**:

```typescript
return {
  content: [
    {
      type: "text",
      text: `Successfully processed ${items.length} items from ${source}`,
    },
    {
      type: "text",
      text: JSON.stringify(
        {
          summary: { total: items.length, processed: results.length },
          results: results,
          metadata: { timestamp: new Date().toISOString() },
        },
        null,
        2
      ),
    },
  ],
};
```

## Configuration and Environment

### 1. Environment Variable Standards

**Naming Convention**: `{SERVICE}__{SETTING}` (uppercase with double underscore)

```bash
# Database configuration
POSTGRES__HOST=localhost
POSTGRES__PORT=5432
POSTGRES__DATABASE=mydb
POSTGRES__USER=user
POSTGRES__PASSWORD=pass
POSTGRES__SSL_MODE=require
POSTGRES__MAX_CONNECTIONS=10

# Service-specific settings
KUBERNETES__KUBECONFIG=/path/to/config
KUBERNETES__DEFAULT_NAMESPACE=local
KUBERNETES__API_TIMEOUT=30000
```

### 2. Configuration Validation

```typescript
interface ServerConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslMode?: boolean;
  maxConnections?: number;
}

function validateConfig(): ServerConfig {
  const config: ServerConfig = {
    host: process.env.POSTGRES__HOST || "localhost",
    port: parseInt(process.env.POSTGRES__PORT || "5432"),
    database: process.env.POSTGRES__DATABASE!,
    user: process.env.POSTGRES__USER!,
    password: process.env.POSTGRES__PASSWORD!,
    sslMode: process.env.POSTGRES__SSL_MODE === "require",
    maxConnections: parseInt(process.env.POSTGRES__MAX_CONNECTIONS || "10"),
  };

  // Validate required fields
  const required = ["database", "user", "password"];
  const missing = required.filter((key) => !config[key as keyof ServerConfig]);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  }

  return config;
}
```

## Error Handling Standards

### 1. Error Response Pattern

```typescript
async function handleToolCall<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<ToolResponse> {
  try {
    const result = await operation();
    return {
      content: [
        { type: "text", text: `${operationName} completed successfully` },
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  } catch (error) {
    console.error(`Error in ${operationName}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error in ${operationName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
```

### 2. Service-Specific Error Handling

```typescript
// Database connection errors
try {
  const result = await pool.query(query, params);
  return formatSuccessResponse(result);
} catch (error) {
  if (error.code === "23505") {
    return formatErrorResponse("Duplicate key violation");
  } else if (error.code === "ECONNREFUSED") {
    return formatErrorResponse("Database connection refused");
  }
  return formatErrorResponse(`Database error: ${error.message}`);
}
```

### 3. Graceful Degradation

```typescript
// Fallback to demo mode when external service unavailable
if (demoMode) {
  return {
    content: [
      { type: "text", text: "Running in demo mode - showing sample data" },
      { type: "text", text: JSON.stringify(mockData, null, 2) },
    ],
  };
}
```

## Documentation Requirements

### 1. Server README Structure

Every server MUST have a README.md with:

````markdown
# [Server Name] MCP Server

Brief description of what the server does.

## Features

- Feature 1: Description
- Feature 2: Description

## Tools

### `tool_name`

Description of what the tool does.

**Parameters:**

- `param1` (string): Description
- `param2` (number, optional): Description with default

**Returns:**

- Success status
- Data description
- Any additional fields

**Example Usage:**
[Provide example of how the tool would be used]

## Configuration

Environment variables required:

- `SERVICE_HOST`: Description (default: localhost)
- `SERVICE_PORT`: Description (default: 5432)

## Dependencies

- dependency1: Purpose
- dependency2: Purpose

## Running the Server

```bash
# Development
npm run dev:servername

# Production
npm run start:servername
```
````

````

### 2. Tool Documentation Standards

```typescript
// In-code documentation
server.tool(
  "descriptive_tool_name",
  {
    // Parameter descriptions must be clear and include examples where helpful
    table_name: z.string().describe("Name of the database table to query (e.g., 'users', 'products')"),
    limit: z.number().optional().describe("Maximum number of rows to return (default: 100, max: 1000)"),
    filters: z.record(z.string()).optional().describe("Column filters as key-value pairs (e.g., {'status': 'active'})"),
  },
  async ({ table_name, limit = 100, filters }) => {
    // Implementation with clear success/error paths
  }
);
````

## Testing and Deployment

### 1. Package.json Integration

**Required Scripts**:

```json
{
  "scripts": {
    "dev:yourserver": "NODE_OPTIONS=\"--loader ts-node/esm\" node src/servers/your-server/your-server.ts",
    "start:yourserver": "node dist/src/servers/your-server/your-server.js"
  }
}
```

### 2. TypeScript Configuration

Must work with the project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist"
  }
}
```

### 3. Process Lifecycle Management

**Required signal handlers**:

```typescript
// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT signal. Shutting down...");
  // Clean up resources (close connections, etc.)
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM signal. Shutting down...");
  await cleanup();
  process.exit(0);
});
```

## Integration and Automation

### 1. Server Registry Updates

When adding a new server, update these files:

**src/index.ts**:

```typescript
const servers = [
  // ... existing servers
  {
    name: "your-server",
    displayName: "Your Server Name",
    path: join(__dirname, "servers/your-server/your-server.ts"),
  },
];
```

**src/run-all.ts**:

```typescript
const servers = [
  // ... existing servers
  {
    name: "Your Server Name",
    path: join(__dirname, "servers/your-server/your-server.ts"),
  },
];
```

### 2. Cursor IDE Integration

The setup script automatically generates:

- Shell scripts for each server (`cursor-{server}-server.sh`)
- MCP configuration instructions
- Absolute paths for Cursor IDE

**Manual verification**:

```bash
npm run setup
# Verify your server appears in the generated scripts and instructions
```

### 3. Development Workflow

```bash
# 1. Create server structure
mkdir -p src/servers/your-server

# 2. Implement server files
# - your-server.ts (main implementation)
# - types.ts (TypeScript definitions)
# - README.md (documentation)

# 3. Register server
# - Add to src/index.ts
# - Add to src/run-all.ts
# - Add npm scripts to package.json

# 4. Test development mode
npm run dev -- your-server

# 5. Test production build
npm run build
npm run start:your-server

# 6. Generate Cursor integration
npm run setup

# 7. Test in Cursor IDE
# - Add server to MCP configuration
# - Test tools in Cursor composer
```

## Advanced Patterns

### 1. Dependency Injection

```typescript
// For testable, modular servers
export class YourServer {
  constructor(
    private config: ServerConfig,
    private apiClient: ExternalAPIClient,
    private logger: Logger = console
  ) {}

  async initialize(): Promise<McpServer> {
    const server = new McpServer({
      name: this.config.name,
      version: this.config.version,
    });

    this.registerTools(server);
    return server;
  }

  private registerTools(server: McpServer): void {
    server.tool("tool_name", schema, this.handleToolCall.bind(this));
  }
}
```

### 2. Connection Pooling and Resource Management

```typescript
// For servers that manage persistent connections
export class ConnectionManager {
  private pool: ConnectionPool;

  constructor(config: PoolConfig) {
    this.pool = new ConnectionPool(config);
    this.setupCleanup();
  }

  private setupCleanup(): void {
    const cleanup = async () => {
      await this.pool.end();
      console.log("Connection pool closed");
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
  }
}
```

### 3. Tool Composition

```typescript
// For servers with complex tool interactions
export class CompositeToolHandler {
  async handleComplexOperation(params: ComplexParams) {
    // Break down complex operations into smaller, reusable pieces
    const step1Result = await this.executeStep1(params.step1Params);
    const step2Result = await this.executeStep2(
      step1Result,
      params.step2Params
    );
    const finalResult = await this.combineResults(step1Result, step2Result);

    return this.formatResponse(finalResult);
  }
}
```

### 4. Validation and Sanitization

```typescript
// Advanced parameter validation
const paramSchema = z.object({
  query: z
    .string()
    .min(1, "Query cannot be empty")
    .max(10000, "Query too long")
    .refine(
      (query) => !query.toLowerCase().includes("drop table"),
      "Destructive operations not allowed"
    ),
  params: z
    .array(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .max(100, "Too many parameters")
    .optional(),
});
```

## Summary Checklist

When building a new MCP server, ensure:

**Core Requirements**:

- [ ] Uses MCP SDK with proper server initialization
- [ ] Implements StdioServerTransport for Cursor compatibility
- [ ] Uses Zod for parameter validation
- [ ] Returns properly formatted responses
- [ ] Handles errors gracefully with isError flag

**Project Integration**:

- [ ] Follows directory structure conventions
- [ ] Registered in src/index.ts and src/run-all.ts
- [ ] Has appropriate npm scripts in package.json
- [ ] Includes comprehensive README.md
- [ ] Defines TypeScript types

**Production Readiness**:

- [ ] Handles process termination signals
- [ ] Manages external resources properly
- [ ] Supports configuration via environment variables
- [ ] Includes demo/fallback mode for development
- [ ] Provides clear error messages

**Documentation**:

- [ ] README with features, tools, and configuration
- [ ] Clear parameter descriptions in tool definitions
- [ ] Usage examples and configuration guide
- [ ] Dependencies and setup instructions

**Testing**:

- [ ] Works in development mode (npm run dev)
- [ ] Builds and runs in production mode
- [ ] Integrates with Cursor IDE setup process
- [ ] Validates all tools with expected parameters

This guide ensures consistency, maintainability, and proper integration with the Cursor IDE ecosystem.
