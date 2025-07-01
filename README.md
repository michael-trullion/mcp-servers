# MCP Servers for Cursor IDE

This project hosts multiple Model-Context-Protocol (MCP) servers designed to work with the Cursor IDE. MCP servers allow Cursor to leverage external tools and functionalities through a standardized communication protocol.

## Table of Contents

- [Prerequisites](#prerequisites)
- [How To Use](#how-to-use)
- [What is MCP?](#what-is-mcp)
- [Project Structure](#project-structure)
- [Available Servers](#available-servers)
  - [PostgreSQL Server](#postgresql-server-setup)
  - [Kubernetes Server](#kubernetes-server-setup)
  - [PDF Server](#pdf-server-setup)
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

1. **PostgreSQL Server** - A server that provides access to a PostgreSQL database for executing queries and retrieving database schema information.
2. **Kubernetes Server** - A server that provides access to a Kubernetes cluster for managing pods, executing commands, and retrieving logs.
3. **PDF Server** - A server that provides PDF document processing capabilities including text extraction, form field reading/writing, and PDF generation.

### PostgreSQL Server Setup

The PostgreSQL server requires the following environment variables:

1. Create a `.env` file in the project root (or copy from `.env.example`):

   ```
   # PostgreSQL Configuration
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=your_database_name
   POSTGRES_USER=your_username
   POSTGRES_PASSWORD=your_password
   # POSTGRES_SSL_MODE=require # Uncomment if SSL is required
   # POSTGRES_MAX_CONNECTIONS=10 # Optional: limit connection pool size
   ```

2. Ensure you have a PostgreSQL database running and accessible with the provided credentials.

#### Available PostgreSQL Tools

The PostgreSQL server exposes the following tools:

- `mcp__get_database_info` - Retrieves information about the connected database
- `mcp__list_tables` - Lists all tables in the current database schema
- `mcp__get_table_structure` - Gets the column definitions for a specific table
- `mcp__execute_query` - Executes a custom SQL query against the database

### Kubernetes Server Setup

The Kubernetes server requires the following environment variables:

1. Create a `.env` file in the project root (or copy from `.env.example`):

   ```
   # Kubernetes Configuration
   KUBECONFIG=/path/to/your/kubeconfig
   # or
   # KUBE_API_URL=https://your-kubernetes-api-server
   # KUBE_API_TOKEN=your-kubernetes-service-account-token
   ```

2. Ensure you have access to a Kubernetes cluster and the appropriate permissions.

#### Available Kubernetes Tools

The Kubernetes server exposes the following tools:

- `get_pods` - Retrieves pods from a specified namespace, with optional field and label selectors
- `find_pods` - Finds pods matching a name pattern in a specified namespace
- `kill_pod` - Deletes a pod in a specified namespace
- `exec_in_pod` - Executes a command in a specified pod and container
- `get_pod_logs` - Retrieves logs from a specified pod, with options for container, line count, and previous instance

### PDF Server Setup

The PDF server provides comprehensive PDF document processing capabilities and requires no additional environment variables or external dependencies beyond the Node.js packages already included in the project.

The server is ready to use immediately after installation and supports:

- Text extraction from PDF documents
- Form field reading and writing
- PDF generation and modification
- Base64 encoding/decoding for web integration

#### Available PDF Tools

The PDF server exposes the following tools:

- `read_pdf` - Extracts text content and form field data from PDF documents

  - **Parameters:**
    - `input` (string): PDF file path or base64 encoded PDF content
  - **Returns:** JSON object containing:
    - `success`: Boolean indicating operation success
    - `pageCount`: Number of pages in the PDF
    - `text`: Extracted text content from all pages
    - `formFields`: Object containing form field names and values (if any)
    - `hasFormFields`: Boolean indicating if the PDF contains fillable forms
    - `metadata`: Additional information about the parsing process

- `write_pdf` - Creates new PDFs or modifies existing ones with content and form field updates
  - **Parameters:**
    - `content` (object): Content to write to PDF
      - `text` (optional string): Text content to add to new PDF
      - `formFields` (optional object): Form fields to update as key-value pairs
    - `templatePdf` (optional string): Template PDF file path or base64 content to modify
    - `outputPath` (optional string): Output file path (if not provided, returns base64)
  - **Returns:** JSON object containing:
    - `success`: Boolean indicating operation success
    - `outputPath`: File path where PDF was saved (if outputPath provided)
    - `hasBase64`: Boolean indicating if base64 data is included
    - `base64Length`: Length of base64 data (if applicable)
    - `base64`: Base64 encoded PDF data (if no outputPath specified)

#### PDF Server Usage Examples

**Reading a PDF file:**

```javascript
// Read from file path
{
  "input": "/path/to/document.pdf"
}

// Read from base64 data
{
  "input": "data:application/pdf;base64,JVBERi0xLjQK..."
}
```

**Creating a new PDF with text:**

```javascript
{
  "content": {
    "text": "Hello World!\n\nThis is a multi-page document that will be automatically formatted."
  },
  "outputPath": "/path/to/output.pdf"
}
```

**Filling out PDF forms:**

```javascript
{
  "content": {
    "formFields": {
      "name": "John Doe",
      "email": "john@example.com",
      "date": "2024-01-01"
    }
  },
  "templatePdf": "/path/to/form-template.pdf",
  "outputPath": "/path/to/filled-form.pdf"
}
```

**Working with base64 (web integration):**

```javascript
// Returns base64 data instead of saving to file
{
  "content": {
    "text": "Document content"
  }
  // No outputPath specified - returns base64 data
}
```

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
