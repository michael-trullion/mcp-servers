import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export interface McpServerConfig {
  name: string;
  version: string;
}

export class McpServerTemplate {
  protected server: McpServer;
  private transport: StdioServerTransport | null = null;
  private config: McpServerConfig;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.server = new McpServer({
      name: config.name,
      version: config.version,
    });
  }

  /**
   * Initialize the server by defining tools and their handlers
   */
  async initialize(): Promise<void> {
    // This method should be overridden by subclasses to define tools
    throw new Error(
      "Method not implemented: Subclasses should implement this method"
    );
  }

  /**
   * Start the server by connecting to the stdio transport
   */
  async start(): Promise<void> {
    try {
      // Register tools before starting
      await this.initialize();

      // Set up stdio transport
      this.transport = new StdioServerTransport();

      // Connect to the transport
      await this.server.connect(this.transport);

      console.log(
        `${this.config.name} v${this.config.version} MCP server started`
      );
    } catch (error) {
      console.error("Error starting MCP server:", error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      console.log(`${this.config.name} MCP server stopped`);
    }
  }
}
