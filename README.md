# MCP Servers for Cursor IDE

This project hosts multiple Model-Context-Protocol (MCP) servers designed to work with the Cursor IDE. MCP servers allow Cursor to leverage external tools and functionalities through a standardized communication protocol.

## What is MCP?

Model Context Protocol (MCP) is an open protocol that standardizes how applications provide context to LLMs (Large Language Models). Think of MCP like a communication interface between Cursor IDE and external tools. MCP servers expose tools that can be used by Cursor IDE to enhance its capabilities.

## Project Structure

```
mcp-servers/
├── src/
│   ├── servers/                  # Individual MCP servers
│   │   ├── addition-server/      # Example addition server
│   │   │   └── addition-server.ts
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

1. **Addition Server** - A simple server that adds two numbers together.
2. **Jira Server** - A server that provides access to Jira's REST API for retrieving projects, issues, boards, and sprints.
3. **GitHub Server** - A server that provides access to GitHub's REST API for retrieving repositories, issues, pull requests, branches, and commits.
4. **PostgreSQL Server** - A server that provides access to a PostgreSQL database for executing queries and retrieving database schema information.

### Jira Server Setup

The Jira server requires the following environment variables:

1. Create a `.env` file in the project root (or copy from `.env.example`):

   ```
   # Jira API Configuration
   JIRA_API_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-jira-api-token
   ```

2. Generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens

#### Available Jira Tools

The Jira server exposes the following tools:

- `get_projects` - Retrieves all accessible Jira projects
- `get_project` - Gets details about a specific project by key
- `search_issues` - Searches for issues using JQL (Jira Query Language)
- `get_issue` - Gets details about a specific issue by key
- `get_boards` - Retrieves all accessible boards
- `get_sprints` - Gets all sprints for a specific board

### GitHub Server Setup

The GitHub server requires the following environment variables:

1. Create a `.env` file in the project root (or copy from `.env.example`):

   ```
   # GitHub API Configuration
   GITHUB_TOKEN=your-github-personal-access-token
   ```

2. Generate a personal access token at: https://github.com/settings/tokens

#### Available GitHub Tools

The GitHub server exposes the following tools:

- `get_repositories` - Retrieves all repositories accessible to the authenticated user
- `get_repository` - Gets details about a specific repository
- `get_issues` - Retrieves issues for a repository
- `get_issue` - Gets details about a specific issue
- `get_pull_requests` - Retrieves pull requests for a repository
- `get_pull_request` - Gets details about a specific pull request
- `get_branches` - Retrieves branches for a repository
- `get_commits` - Gets commits for a repository, optionally filtered by branch

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

## Prerequisites

- Node.js (v16 or newer)
- npm or yarn

## Installation

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
   - Make all shell scripts executable
   - Generate Cursor IDE setup commands for each server

## Running the Servers

### Quick Start

The setup command creates individual shell scripts for each server that can be used directly with Cursor IDE.
After running `npm run setup`, you'll see instructions for each server configuration.

### Running a Server Using the Helper Script

To run a specific server using the included helper script:

```
npm run server -- [server-name]
```

For example, to run the addition server:

```
npm run server -- addition
```

This will automatically build the TypeScript code and start the server.

### Running a Single Server Manually

To run a specific server manually:

```
npm run dev -- [server-name]
```

For example, to run the addition server:

```
npm run dev -- addition
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

## Connecting to Cursor IDE

The most reliable way to connect your MCP server to Cursor IDE is:

1. First, build your TypeScript project to JavaScript:

   ```
   npm run build
   ```

2. Then, in Cursor IDE:

   - Go to **Settings**
   - Navigate to the **AI** section
   - Look for **Custom AI Models** or **External Models**
   - Select **Add Model**

3. In the configuration:

   - **Name**: A display name (e.g., "Addition Server")
   - **Connection Type**: Select "Custom Command" or "stdio" (depending on your Cursor version)
   - **Command**: Use the provided script for simplicity:

     ```
     /path/to/mcp-servers/cursor-mcp-server.sh
     ```

     This script handles directory changes and proper execution of the server.

Alternative approaches:

- Run the JavaScript file directly:

  ```
  node /path/to/mcp-servers/dist/src/servers/addition-server/addition-server.js
  ```

- Create your own custom script if needed

**Important Notes:**

- Cursor uses stdio (standard input/output) to communicate with MCP servers
- Any output to stdout/stderr other than MCP protocol messages will break the communication
- The built JavaScript version is more reliable than running TypeScript directly
- Cursor expects the server to strictly follow the MCP protocol specification

## Testing Your MCP Server

Before connecting to Cursor IDE, you can test your MCP server's functionality:

1. Build your TypeScript project:

   ```
   npm run build
   ```

2. Run the server:

   ```
   npm run start:addition
   ```

3. In a separate terminal, you can test the server by sending MCP protocol messages manually:

   ```json
   {
     "type": "request",
     "id": "test1",
     "name": "add",
     "params": { "num1": 5, "num2": 7 }
   }
   ```

   The server should respond with:

   ```json
   {
     "type": "response",
     "id": "test1",
     "content": [
       { "type": "text", "text": "The sum of 5 and 7 is 12." },
       {
         "type": "text",
         "text": "{\n  \"num1\": 5,\n  \"num2\": 7,\n  \"sum\": 12\n}"
       }
     ]
   }
   ```

4. For convenience, this project includes a ready-to-use script for Cursor:

   ```
   /path/to/mcp-servers/cursor-mcp-server.sh
   ```

   You can use this script path directly in your Cursor IDE configuration.

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
