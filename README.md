# MCP Servers for Cursor IDE

This project hosts multiple Model-Context-Protocol (MCP) servers designed to work with the Cursor IDE. MCP servers allow Cursor to leverage external tools and functionalities through a standardized communication protocol.

## Table of Contents

- [How To Use](#how-to-use)
- [What is MCP?](#what-is-mcp)
- [Project Structure](#project-structure)
- [Available Servers](#available-servers)
- [Server Configuration](#server-configuration)
- [Available Tools](#available-tools)
- [Running the Servers](#running-the-servers)
  - [Quick Start](#quick-start)
  - [Running a Server Using the Helper Script](#running-a-server-using-the-helper-script)
  - [Running a Single Server Manually](#running-a-single-server-manually)
  - [Running All Servers](#running-all-servers)
  - [List Available Servers](#list-available-servers)
- [Testing Your MCP Server](#testing-your-mcp-server)
- [Adding a New MCP Server](#adding-a-new-mcp-server)
- [Understanding MCP Server Development](#understanding-mcp-server-development)
- [Building the Project](#building-the-project)

## Prerequisites

- Node.js (v16 or newer)
- npm or yarn

## How To Use

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/mcp-servers.git
   cd mcp-servers
   ```

2. Install dependencies and set up everything:

   ```
   npm run setup
   ```

   This command will:

   - Install all dependencies
   - Build the TypeScript project
   - Generate the necessary scripts for Cursor IDE integration
   - Provide instructions for setting up each server in Cursor

3. Configure Cursor IDE:

   - Open Cursor IDE
   - Go to Cursor Settings > Features > Mcp Servers
   - Click "Add New Mcp Server"
   - Enter a name for the server (e.g., "postgres")
   - For "Connection Type", select "command"
   - For "command", paste the path provided by the prepare script
   - Click "Save"

4. Environment Variables:

   - Copy the `.env.example` file to `.env`
   - Update the variables with your own credentials for each service

5. Use Mcp In Cursor IDE:

   - Open the composer
   - make sure you are using agent mode (claude 3.7 sonnet thinking is recommended)
   - submit the message you want to cursor

## What is MCP?

Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to LLMs (Large Language Models). Think of MCP like a communication interface between Cursor IDE and external tools. MCP servers expose tools that can be used by Cursor IDE to enhance its capabilities.

## Project Structure

```
mcp-servers/
├── src/
│   ├── servers/                  # Individual MCP servers
│   │   ├── postgres-server/      # PostgreSQL integration server
│   │   │   └── postgres-server.ts
│   │   ├── kubernetes-server/    # Kubernetes integration server
│   │   │   └── kubernetes-server.ts
│   │   ├── lease-pdf-server/     # PDF processing server
│   │   │   └── pdf-server.ts
│   │   └── ... (more servers)
│   ├── template/                 # Reusable templates
│   │   └── mcp-server-template.ts
│   ├── index.ts                  # Server runner utility
│   └── run-all.ts                # Script to run all servers
├── package.json
└── tsconfig.json
```

## Available Servers

Currently, the following MCP servers are available:

1. **PostgreSQL Server** - Provides access to PostgreSQL databases for executing queries and retrieving schema information
2. **Kubernetes Server** - Provides access to Kubernetes clusters for managing pods, executing commands, and retrieving logs
3. **PDF Server** - Provides PDF document processing capabilities including text extraction, form field reading/writing, and PDF generation

## Server Configuration

All servers are configured through environment variables. Create a `.env` file in the project root (or copy from `.env.example`) and configure the services you plan to use:

```bash
# PostgreSQL Configuration (for PostgreSQL server)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=your_database_name
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
# POSTGRES_SSL_MODE=require # Uncomment if SSL is required
# POSTGRES_MAX_CONNECTIONS=10 # Optional: limit connection pool size

# Kubernetes Configuration (for Kubernetes server)
KUBECONFIG=/path/to/your/kubeconfig
# Alternative Kubernetes configuration:
# KUBE_API_URL=https://your-kubernetes-api-server
# KUBE_API_TOKEN=your-kubernetes-service-account-token

# PDF Server requires no additional configuration
```

## Available Tools

### PostgreSQL Server Tools

- `mcp__get_database_info` - Retrieves information about the connected database
- `mcp__list_tables` - Lists all tables in the current database schema
- `mcp__get_table_structure` - Gets the column definitions for a specific table
- `mcp__execute_query` - Executes a custom SQL query against the database

### Kubernetes Server Tools

- `get_pods` - Retrieves pods from a specified namespace, with optional field and label selectors
- `find_pods` - Finds pods matching a name pattern in a specified namespace
- `kill_pod` - Deletes a pod in a specified namespace
- `exec_in_pod` - Executes a command in a specified pod and container
- `get_pod_logs` - Retrieves logs from a specified pod, with options for container, line count, and previous instance

### PDF Server Tools

- `read_pdf` - Extracts text content and form field data from PDF documents

  - **Parameters:** `input` (string) - PDF file path or base64 encoded PDF content
  - **Returns:** JSON with success status, page count, extracted text, form fields, and metadata

- `write_pdf` - Creates new PDFs or modifies existing ones with content and form field updates
  - **Parameters:**
    - `content` (object) - Content to write (text and/or form fields)
    - `templatePdf` (optional string) - Template PDF file path or base64 content
    - `outputPath` (optional string) - Output file path (returns base64 if not provided)
  - **Returns:** JSON with success status, output path, and base64 data (if applicable)

## Running the Servers

### Quick Start

The setup command creates individual shell scripts for each server that can be used directly with Cursor IDE.
After running `npm run setup`, you'll see instructions for each server configuration.

### Running a Server Using the Helper Script

To run a specific server using the included helper script:

```
npm run server -- [server-name]
```

For example, to run the postgres server:

```
npm run server -- postgres
```

Or to run the PDF server:

```
npm run server -- pdf
```

This will automatically build the TypeScript code and start the server.

### Running a Single Server Manually

To run a specific server manually:

```
npm run dev -- [server-name]
```

For example, to run the postgres server:

```
npm run dev -- postgres
```

Or to run the PDF server:

```
npm run dev -- pdf
```

### Running All Servers

To run all servers simultaneously:

```
npm run dev:all
```

### List Available Servers

To see a list of all available servers:

```
npm run dev -- --list
```

## Testing Your MCP Server

Before connecting to Cursor IDE, you can test your MCP server's functionality:

1. Build your TypeScript project:

   ```
   npm run build
   ```

2. Run the server:

   ```
   npm run start:postgres
   ```

   Or for the PDF server:

   ```
   npm run start:pdf
   ```

3. For convenience, this project includes a ready-to-use script for Cursor:

   ```
   /path/to/mcp-servers/cursor-mcp-server.sh [server-name]
   ```

   You can use this script path directly in your Cursor IDE configuration. If no server name is provided, it defaults to the postgres server. Examples:

   ```
   # Run postgres server (default)
   /path/to/mcp-servers/cursor-mcp-server.sh

   # Run PDF server
   /path/to/mcp-servers/cursor-mcp-server.sh pdf

   # Run kubernetes server
   /path/to/mcp-servers/cursor-mcp-server.sh kubernetes
   ```

## Adding a New MCP Server

To add a new MCP server to this project:

1. Create a new directory for your server under `src/servers/`:

   ```
   mkdir -p src/servers/my-new-server
   ```

2. Create your server implementation:

   ```typescript
   // src/servers/my-new-server/my-new-server.ts
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
   import { z } from "zod";

   // Create an MCP server
   const server = new McpServer({
     name: "My New Server",
     version: "1.0.0",
   });

   // Add your tools
   server.tool(
     "my-tool",
     {
       param1: z.string().describe("Parameter description"),
       param2: z.number().describe("Parameter description"),
     },
     async ({ param1, param2 }) => {
       // Tool implementation
       return {
         content: [{ type: "text", text: `Result: ${param1} ${param2}` }],
       };
     }
   );

   // Start the server
   async function startServer() {
     const transport = new StdioServerTransport();
     await server.connect(transport);
     console.log("My New Server started and ready to process requests");
   }

   // Start the server if this file is run directly
   if (process.argv[1] === new URL(import.meta.url).pathname) {
     startServer();
   }

   export default server;
   ```

3. Add your server to the server list in `src/index.ts` and `src/run-all.ts`:

   ```typescript
   const servers = [
     // ... existing servers
     {
       name: "my-new-server",
       displayName: "My New Server",
       path: join(__dirname, "servers/my-new-server/my-new-server.ts"),
     },
   ];
   ```

4. Update the package.json scripts (optional):
   ```json
   "scripts": {
     // ... existing scripts
     "dev:my-new-server": "ts-node --esm src/servers/my-new-server/my-new-server.ts"
   }
   ```

## Understanding MCP Server Development

When developing an MCP server, keep in mind:

1. **Tools** are the primary way to expose functionality. Each tool should:

   - Have a unique name
   - Define parameters using Zod for validation
   - Return results in a standardized format

2. **Communication** happens via stdio for Cursor integration.

3. **Response Format** is critical - MCP servers must follow the exact format:

   - Tools should return content with `type: "text"` for text responses
   - Avoid using unsupported types like `type: "json"` directly
   - For structured data, convert to JSON string and use `type: "text"`
   - Example:
     ```typescript
     return {
       content: [
         { type: "text", text: "Human-readable response" },
         { type: "text", text: JSON.stringify(structuredData, null, 2) },
       ],
     };
     ```

## Building the Project

To build the project, run:

```
npm run build
```
