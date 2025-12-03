# Redash MCP Server

An MCP (Model Context Protocol) server for integrating Redash with Cursor IDE. This server provides tools to interact with Redash's API for managing queries (read-only) and dashboards (read/write).

## Features

- **Query Management (Read-Only)**
  - List and search queries
  - Get query details and SQL
  - Execute queries with parameter support
  - Monitor async job status
  - Retrieve query results in JSON or CSV format

- **Dashboard Management (Read/Write)**
  - List and view dashboards
  - Create new dashboards
  - Update dashboard properties
  - Archive (delete) dashboards

## Configuration

Set the following environment variables in your `.env` file:

```bash
# Required: Your Redash instance URL
REDASH_URL=https://app.redash.io/your-org
# or for self-hosted:
# REDASH_URL=https://redash.example.com

# Required: Your Redash API key (found on user profile page)
REDASH_API_KEY=your_api_key_here
```

### API Key Types

Redash supports two types of API keys:

1. **User API Key**: Has the same permissions as the user who owns it. Found on your user profile page. Use this for full access to queries and dashboards.

2. **Query API Key**: Limited access to only that query and its results. Found on individual query pages. Use this if you only need to execute specific queries.

## Tools

### Query Tools (Read-Only)

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

### Dashboard Tools (Read/Write)

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

#### `delete_dashboard`

Archive a dashboard (soft delete).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `slug` | string | Yes | Dashboard slug to archive |

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

### Create and Update a Dashboard

```typescript
// Create a new dashboard
{
  "name": "Sales Overview",
  "tags": ["sales", "2024"]
}

// Update the dashboard (use ID from create response)
{
  "dashboard_id": 123,
  "name": "Sales Overview - Q4",
  "dashboard_filters_enabled": true
}
```

## Running the Server

### Development

```bash
npm run dev -- redash
```

### Production

```bash
npm run build
npm run start:redash
```

## Dependencies

This server uses the following dependencies (already included in the project):

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `zod` - Parameter validation
- `dotenv` - Environment variable loading

## API Reference

For complete Redash API documentation, see:
https://redash.io/help/user-guide/integrations-and-api/api/

