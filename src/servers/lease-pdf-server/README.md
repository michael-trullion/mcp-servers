# PDF MCP Server

A Model Context Protocol (MCP) server that provides basic PDF reading and writing functionality.

## Features

- **Read PDF**: Extract text content and form fields from PDF files
- **Write PDF**: Create new PDFs or modify existing ones with new content

## Tools

### `read_pdf`

Extracts content from PDF files.

**Parameters:**

- `input` (string): PDF file path or base64 encoded PDF content

**Returns:**

- Success status
- Page count
- Extracted text content
- Form fields (if any)

### `write_pdf`

Creates or modifies PDF files.

**Parameters:**

- `content` (object):
  - `text` (optional): Text content to add to PDF
  - `formFields` (optional): Form fields to update as key-value pairs
- `templatePdf` (optional): Template PDF file path or base64 content to modify
- `outputPath` (optional): Output file path (if not provided, returns base64)

**Returns:**

- Success status
- Output file path (if specified)
- Base64 encoded PDF (if no output path specified)

## Usage

The server is designed to be used with an MCP client (like Cursor) where the AI handles the logic of what data to modify or fake. The server provides the basic PDF manipulation primitives.

### Example Workflow for Data Anonymization:

1. **Read PDF**: Use `read_pdf` to extract content from a lease contract
2. **AI Processing**: The MCP client (Cursor) uses AI to:
   - Identify sensitive data (names, addresses, financial amounts)
   - Generate realistic fake replacements
   - Maintain document structure and relationships
3. **Write PDF**: Use `write_pdf` to create the anonymized version

## Dependencies

- `pdf-lib`: PDF creation and modification
- `pdf-parse`: PDF text extraction
- `@modelcontextprotocol/sdk`: MCP framework

## Running the Server

```bash
# Development mode
npm run dev:pdf

# Production mode
npm run start:pdf
```

## Input Formats

The server accepts PDF input in multiple formats:

- File path: `/path/to/document.pdf`
- Base64 with data URL: `data:application/pdf;base64,JVBERi0xLjQ...`
- Raw base64: `JVBERi0xLjQ...`
