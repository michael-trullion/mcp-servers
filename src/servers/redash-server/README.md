# Redash MCP Server

An MCP (Model Context Protocol) server for integrating Redash with Cursor IDE and other MCP clients. This server provides tools to interact with Redash's API for managing queries, dashboards, and widgets.

## Installation

```bash
npm install trullion-redash-mcp
```

Or use it ad-hoc without installing:
```bash
npx trullion-redash-mcp
```

## Features

- **Query Management**
  - List and search queries
  - Get query details and SQL
  - Create new queries with SQL
  - Update existing queries (name, SQL, description, tags)
  - Fork (duplicate) existing queries
  - Execute queries with parameter support
  - Monitor async job status
  - Retrieve query results in JSON or CSV format

- **Dashboard Management**
  - List and view dashboards
  - Create new dashboards
  - Update dashboard properties

- **Widget Management**
  - Add visualizations from existing queries to dashboards
  - Add text widgets to dashboards
  - Update widget position and size

## Configuration

**Important**: This package does not include any environment variables. You must configure your Redash credentials by setting environment variables in your environment or MCP client configuration.

Set the following environment variables **before running the server**:

```bash
# Required: Your Redash instance URL
export REDASH_URL=https://app.redash.io/your-org
# or for self-hosted:
# export REDASH_URL=https://redash.example.com

# Required: Your Redash API key (found on user profile page)
export REDASH_API_KEY=your_api_key_here
```

### For Cursor IDE

When configuring this server in Cursor IDE, add these environment variables to your MCP server configuration:

```json
{
  "mcpServers": {
    "redash": {
    "command": "trullion-redash-mcp",
    "args": [],
      "env": {
        "REDASH_URL": "https://app.redash.io/your-org",
        "REDASH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### For Other MCP Clients

Set the environment variables in your shell or process environment before starting the MCP server. The server uses `dotenv` to load variables, but you should primarily set them in your environment to avoid committing secrets.

### API Key Types

Redash supports two types of API keys:

1. **User API Key**: Has the same permissions as the user who owns it. Found on your user profile page. Use this for full access to queries and dashboards.

2. **Query API Key**: Limited access to only that query and its results. Found on individual query pages. Use this if you only need to execute specific queries.

## Tools

### Query Tools

#### `list_queries`

Get a paginated list of all queries.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `page_size` | number | No | Results per page (default: 25) |

**Example:**
```
List all queries, page 1
```

---

#### `get_query`

Get details of a specific query by ID.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_id` | number | Yes | The query ID |

**Example:**
```
Get query with ID 42
```

---

#### `execute_query`

Execute a query and optionally wait for results.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_id` | number | Yes | The query ID to execute |
| `parameters` | object | No | Query parameters as key-value pairs |
| `max_age` | number | No | Max cache age in seconds (0 = force fresh) |
| `wait_for_result` | boolean | No | Wait for completion (default: true) |
| `format` | "json" \| "csv" | No | Output format (default: "json") |

**Example with parameters:**
```
Execute query 42 with parameters:
- date_param: "2024-01-01"
- number_param: 100
- date_range_param: {"start": "2024-01-01", "end": "2024-12-31"}
```

---

#### `get_job_status`

Check the status of an async query execution job.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `job_id` | string | Yes | Job ID from execute_query |

**Job Statuses:**
- `1` - PENDING (waiting to execute)
- `2` - STARTED (executing)
- `3` - SUCCESS (complete, has `query_result_id`)
- `4` - FAILURE (has error message)
- `5` - CANCELLED

---

#### `get_query_result`

Retrieve results from a completed query.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_result_id` | number | Yes | The query result ID |
| `format` | "json" \| "csv" | No | Output format (default: "json") |

---

#### `fork_query`

Fork (duplicate) an existing query. Creates a copy with the same SQL.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_id` | number | Yes | The ID of the query to fork |

**Example:**
```
Fork query with ID 42 to create a copy
```

---

#### `create_query`

Create a new query with SQL.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Name for the new query |
| `query` | string | Yes | The SQL query to execute |
| `data_source_id` | number | Yes | ID of the data source |
| `description` | string | No | Optional description |
| `is_draft` | boolean | No | Draft status (default: true) |
| `tags` | string[] | No | Optional tags |

**Example:**
```typescript
{
  "name": "Active Users Count",
  "query": "SELECT COUNT(*) as count FROM users WHERE active = true",
  "data_source_id": 1,
  "description": "Counts all active users",
  "tags": ["users", "metrics"]
}
```

---

#### `update_query`

Update an existing query's properties or SQL.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_id` | number | Yes | The query ID to update |
| `name` | string | No | New name |
| `query` | string | No | New SQL query |
| `description` | string | No | New description |
| `is_draft` | boolean | No | Draft status |
| `is_archived` | boolean | No | Archive status |
| `tags` | string[] | No | New tags |

**Example:**
```typescript
{
  "query_id": 42,
  "name": "Active Users Count - Updated",
  "query": "SELECT COUNT(*) as count FROM users WHERE active = true AND created_at > '2024-01-01'"
}
```

---

#### `publish_query`

Publish a query by setting `is_draft` to `false`.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_id` | number | Yes | The query ID to publish |

**Example:**
```
Publish query with ID 42
```

---

#### `create_visualization`

Create a visualization for an existing query.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query_id` | number | Yes | Query ID to attach the visualization to |
| `name` | string | Yes | Visualization name |
| `type` | string | Yes | Visualization type (e.g., TABLE, CHART, COUNTER) |
| `description` | string | No | Optional description |
| `options` | object | No | Visualization options/config JSON |

**Example:**
```typescript
{
  "query_id": 123,
  "name": "Status Distribution",
  "type": "PIE",
  "options": {
    "columnMapping": { "status": "x", "count": "y" },
    "showDataLabels": true
  }
}
```

---

### Dashboard Tools

#### `list_dashboards`

Get a paginated list of all dashboards.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `page_size` | number | No | Results per page (default: 25) |

---

#### `get_dashboard`

Get details of a specific dashboard by slug.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `slug` | string | Yes | Dashboard slug (URL-friendly name) |

---

#### `create_dashboard`

Create a new dashboard.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Dashboard name |
| `tags` | string[] | No | Optional tags |

---

#### `update_dashboard`

Update an existing dashboard.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dashboard_id` | number | Yes | Dashboard ID (not slug) |
| `name` | string | No | New name |
| `is_draft` | boolean | No | Draft status |
| `is_archived` | boolean | No | Archive status |
| `tags` | string[] | No | New tags |
| `dashboard_filters_enabled` | boolean | No | Enable/disable filters |

---

#### `publish_dashboard`

Publish a dashboard by setting `is_draft` to `false`.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dashboard_id` | number | Yes | Dashboard ID (not slug) |

**Example:**
```
Publish dashboard with ID 123
```

---

### Widget Tools

#### `add_widget_to_dashboard`

Add a visualization or text widget to a dashboard.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dashboard_id` | number | Yes | The dashboard ID |
| `visualization_id` | number | No | Visualization ID to add (from existing query) |
| `text` | string | No | Text content for text widget |
| `width` | number | No | Widget width in grid units |
| `options` | object | No | Widget options including position |

Note: Either `visualization_id` or `text` must be provided.

**Example (add visualization):**
```typescript
{
  "dashboard_id": 123,
  "visualization_id": 456,
  "options": {
    "position": {
      "col": 0,
      "row": 0,
      "sizeX": 3,
      "sizeY": 2
    }
  }
}
```

**Example (add text widget):**
```typescript
{
  "dashboard_id": 123,
  "text": "## Sales Summary\nThis section shows key metrics.",
  "width": 2
}
```

---

#### `update_widget`

Update an existing widget's position, size, or text.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `widget_id` | number | Yes | The widget ID to update |
| `text` | string | No | New text (for text widgets) |
| `width` | number | No | New width in grid units |
| `options` | object | No | Widget options including position |

---

## Usage Examples

### Execute a Parameterized Query

```typescript
// Using the execute_query tool with parameters
{
  "query_id": 42,
  "parameters": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "limit": 100
  },
  "max_age": 0  // Force fresh execution
}
```

### Create a Dashboard and Add Widgets

```typescript
// 1. Create a new dashboard
{
  "name": "Sales Overview",
  "tags": ["sales", "2024"]
}

// 2. Add a visualization from an existing query
// First, get the query to find its visualization IDs
{
  "query_id": 42
}

// 3. Add the visualization to the dashboard
{
  "dashboard_id": 123,
  "visualization_id": 456,
  "options": {
    "position": { "col": 0, "row": 0, "sizeX": 3, "sizeY": 2 }
  }
}

// 4. Add a text header
{
  "dashboard_id": 123,
  "text": "## Monthly Sales Report"
}
```

### Fork a Query

```typescript
// Fork query 42 to create your own copy
{
  "query_id": 42
}
// Returns a new query with the same SQL that you own
```

### Create a New Query

```typescript
// Create a query to count users by status
{
  "name": "Users by Status",
  "query": "SELECT status, COUNT(*) as count FROM users GROUP BY status",
  "data_source_id": 1,
  "description": "Breakdown of users by their current status",
  "tags": ["users", "analytics"]
}
```

## Running the Server

### As an npm package

After installation, you can run the server directly:

```bash
# Make sure environment variables are set
export REDASH_URL=https://app.redash.io/your-org
export REDASH_API_KEY=your_api_key_here

# Run the server
# If installed locally
node node_modules/trullion-redash-mcp/dist/index.js

# If installed globally or via npx
trullion-redash-mcp
```

### Development (from source)

If you're developing the package itself:

```bash
npm run build
npm run start
```

## Dependencies

This server uses the following dependencies (already included in the project):

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `zod` - Parameter validation
- `dotenv` - Environment variable loading

## API Reference

For complete Redash API documentation, see:
https://redash.io/help/user-guide/integrations-and-api/api/

