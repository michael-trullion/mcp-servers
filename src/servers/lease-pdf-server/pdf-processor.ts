import { PDFDocument, PDFForm, PDFTextField, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";
import { PdfReadResult, PdfWriteRequest, PdfWriteResult } from "./types.js";

export class PdfProcessor {
  /**
   * Custom page render function for better text extraction
   */
  private renderPage(pageData: any) {
    // Enhanced render options for better text extraction
    const renderOptions = {
      // Normalize whitespace to standard spaces
      normalizeWhitespace: true,
      // Don't combine text items to preserve structure
      disableCombineTextItems: true,
    };

    return pageData.getTextContent(renderOptions).then((textContent: any) => {
      let lastY: number | undefined;
      let text = "";

      // Process each text item
      for (const item of textContent.items) {
        // Add line breaks when Y position changes significantly
        if (lastY !== undefined && Math.abs(lastY - item.transform[5]) > 1) {
          text += "\n";
        }

        // Add the text content
        text += item.str;

        // Add space if this item doesn't end the line and next item is on same line
        if (item.hasEOL === false) {
          text += " ";
        }

        lastY = item.transform[5];
      }

      return text;
    });
  }

  /**
   * Read PDF content - extracts text and form fields with enhanced options
   */
  async readPdf(input: string): Promise<PdfReadResult> {
    try {
      let pdfBuffer: Buffer;

      // Handle input as file path or base64
      if (input.startsWith("data:application/pdf;base64,")) {
        const base64Data = input.split(",")[1];
        pdfBuffer = Buffer.from(base64Data, "base64");
      } else if (input.length > 500) {
        // Assume it's base64 without data URL prefix
        pdfBuffer = Buffer.from(input, "base64");
      } else {
        // Assume it's a file path
        if (!fs.existsSync(input)) {
          return { success: false, error: `File not found: ${input}` };
        }
        pdfBuffer = fs.readFileSync(input);
      }

      // Enhanced parsing options for better text extraction
      const options = {
        // Parse all pages (0 = all pages)
        max: 0,
        // Use our custom page render function
        pagerender: this.renderPage,
        // Use a valid PDF.js version for better compatibility
        version: "v1.10.100" as const,
      };

      console.log(`Starting PDF parsing with enhanced options...`);

      // Extract text content with enhanced options
      const pdfData = await pdfParse(pdfBuffer, options);

      console.log(`PDF parsing completed:
        - Total pages: ${pdfData.numpages}
        - Pages rendered: ${pdfData.numrender || "N/A"}
        - Text length: ${pdfData.text.length} characters
        - First 200 chars: ${pdfData.text.substring(0, 200)}...`);

      // Extract form fields using pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const form = pdfDoc.getForm();
      const formFields: Record<string, string> = {};

      try {
        const fields = form.getFields();
        console.log(`Found ${fields.length} form fields`);

        fields.forEach((field) => {
          const fieldName = field.getName();
          if (field instanceof PDFTextField) {
            formFields[fieldName] = field.getText() || "";
          } else {
            // Handle other field types as needed
            formFields[fieldName] = field.toString();
          }
        });
      } catch (error) {
        // PDF might not have form fields, that's okay
        console.log("No form fields found or error reading form fields");
      }

      return {
        success: true,
        content: {
          text: pdfData.text,
          formFields:
            Object.keys(formFields).length > 0 ? formFields : undefined,
          pageCount: pdfData.numpages,
          // Add additional metadata for debugging
          metadata: {
            numrender: pdfData.numrender,
            info: pdfData.info,
            textLength: pdfData.text.length,
          },
        },
      };
    } catch (error) {
      console.error("PDF parsing error:", error);
      return {
        success: false,
        error: `Error reading PDF: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Write/Create PDF - creates new PDF or modifies existing one
   */
  async writePdf(
    request: PdfWriteRequest,
    outputPath?: string
  ): Promise<PdfWriteResult> {
    try {
      let pdfDoc: PDFDocument;

      // If template PDF provided, load it; otherwise create new document
      if (request.templatePdf) {
        let templateBuffer: Buffer;

        if (request.templatePdf.startsWith("data:application/pdf;base64,")) {
          const base64Data = request.templatePdf.split(",")[1];
          templateBuffer = Buffer.from(base64Data, "base64");
        } else if (request.templatePdf.length > 500) {
          templateBuffer = Buffer.from(request.templatePdf, "base64");
        } else {
          if (!fs.existsSync(request.templatePdf)) {
            return {
              success: false,
              error: `Template file not found: ${request.templatePdf}`,
            };
          }
          templateBuffer = fs.readFileSync(request.templatePdf);
        }

        pdfDoc = await PDFDocument.load(templateBuffer);
      } else {
        pdfDoc = await PDFDocument.create();
      }

      // Update form fields if provided
      if (request.content.formFields) {
        try {
          const form = pdfDoc.getForm();

          Object.entries(request.content.formFields).forEach(
            ([fieldName, value]) => {
              try {
                const field = form.getTextField(fieldName);
                field.setText(value);
              } catch (error) {
                console.log(`Could not update field ${fieldName}: ${error}`);
              }
            }
          );
        } catch (error) {
          console.log("Error updating form fields:", error);
        }
      }

      // Add text content if provided and no template (multi-page text PDF)
      if (request.content.text && !request.templatePdf) {
        await this.addMultiPageText(pdfDoc, request.content.text);
      }

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Save to file if output path provided
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(outputPath, pdfBytes);

        return {
          success: true,
          outputPath: outputPath,
        };
      } else {
        // Return as base64
        const base64 = Buffer.from(pdfBytes).toString("base64");
        return {
          success: true,
          base64: base64,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error writing PDF: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Add multi-page text to a PDF document with proper pagination
   */
  private async addMultiPageText(
    pdfDoc: PDFDocument,
    text: string
  ): Promise<void> {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = fontSize * 1.5; // 1.5 line spacing for readability
    const pageMargin = 50;

    // Standard US Letter page dimensions
    const pageWidth = 612;
    const pageHeight = 792;
    const textWidth = pageWidth - pageMargin * 2;
    const textHeight = pageHeight - pageMargin * 2;
    const linesPerPage = Math.floor(textHeight / lineHeight);

    console.log(`Multi-page text setup:
      - Font size: ${fontSize}
      - Line height: ${lineHeight}
      - Lines per page: ${linesPerPage}
      - Text width: ${textWidth}
      - Text height: ${textHeight}
      - Page margins: ${pageMargin}`);

    // Split text into lines, preserving existing line breaks
    const lines = text.split("\n");
    console.log(`Total lines to process: ${lines.length}`);

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentLineOnPage = 0;
    let pageCount = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we need a new page BEFORE processing the line
      if (currentLineOnPage >= linesPerPage) {
        console.log(
          `Creating new page at line ${i}, current line on page: ${currentLineOnPage}`
        );
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentLineOnPage = 0;
        pageCount++;
        console.log(`Created page ${pageCount}`);
      }

      // Calculate Y position (top to bottom)
      const yPosition =
        pageHeight - pageMargin - currentLineOnPage * lineHeight;

      // Draw the line (simplified - no word wrapping for now)
      const textToDraw = line || " "; // Handle empty lines
      console.log(
        `Drawing line ${i + 1} on page ${pageCount}, line ${
          currentLineOnPage + 1
        }: "${textToDraw.substring(0, 50)}..."`
      );

      currentPage.drawText(textToDraw, {
        x: pageMargin,
        y: yPosition,
        font: font,
        size: fontSize,
        maxWidth: textWidth,
      });

      currentLineOnPage++;
    }

    console.log(
      `Multi-page text complete: ${pageCount} pages created, ${lines.length} lines processed`
    );
  }
}
