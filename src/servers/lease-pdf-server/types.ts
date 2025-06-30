export interface PdfReadResult {
  success: boolean;
  content?: {
    text: string;
    formFields?: Record<string, string>;
    pageCount: number;
    metadata?: {
      numrender?: number;
      info?: any;
      textLength: number;
    };
  };
  error?: string;
}

export interface PdfWriteRequest {
  content: {
    text?: string;
    formFields?: Record<string, string>;
  };
  templatePdf?: string; // Base64 or file path to use as template
}

export interface PdfWriteResult {
  success: boolean;
  outputPath?: string;
  base64?: string;
  error?: string;
}
