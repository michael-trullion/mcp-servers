import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PdfProcessor } from "./pdf-processor.js";

// Create an MCP server
const server = new McpServer({
  name: "PDF Server",
  version: "1.0.0",
});

const pdfProcessor = new PdfProcessor();

// Tool 1: Read PDF - extracts text and form field data
server.tool(
  "read_pdf",
  {
    input: z.string().describe("PDF file path or base64 encoded PDF content"),
  },
  async ({ input }) => {
    try {
      const result = await pdfProcessor.readPdf(input);

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error reading PDF: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      const response = {
        success: true,
        pageCount: result.content?.pageCount || 0,
        text: result.content?.text || "",
        formFields: result.content?.formFields || {},
        hasFormFields:
          !!result.content?.formFields &&
          Object.keys(result.content.formFields).length > 0,
      };

      return {
        content: [
          { type: "text" as const, text: "PDF read successfully" },
          { type: "text" as const, text: JSON.stringify(response, null, 2) },
        ],
      };
    } catch (error) {
      console.error("Error in read_pdf handler:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error reading PDF: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: Write PDF - creates or modifies PDF with new content
server.tool(
  "write_pdf",
  {
    content: z
      .object({
        text: z.string().optional().describe("Text content to add to PDF"),
        formFields: z
          .record(z.string())
          .optional()
          .describe("Form fields to update as key-value pairs"),
      })
      .describe("Content to write to PDF"),
    templatePdf: z
      .string()
      .optional()
      .describe("Template PDF file path or base64 content to modify"),
    outputPath: z
      .string()
      .optional()
      .describe("Output file path (if not provided, returns base64)"),
  },
  async ({ content, templatePdf, outputPath }) => {
    try {
      const writeRequest = {
        content: content,
        templatePdf: templatePdf,
      };

      const result = await pdfProcessor.writePdf(writeRequest, outputPath);

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error writing PDF: ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      const response = {
        success: true,
        outputPath: result.outputPath,
        hasBase64: !!result.base64,
        base64Length: result.base64 ? result.base64.length : 0,
      };

      const responseContent = [
        { type: "text" as const, text: "PDF written successfully" },
        { type: "text" as const, text: JSON.stringify(response, null, 2) },
      ];

      // Include base64 data if no output path was specified
      if (result.base64 && !outputPath) {
        responseContent.push({
          type: "text" as const,
          text: `Base64 PDF Data:\ndata:application/pdf;base64,${result.base64}`,
        });
      }

      return {
        content: responseContent,
      };
    } catch (error) {
      console.error("Error in write_pdf handler:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error writing PDF: ${
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
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("PDF Server started and ready to process requests");
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
