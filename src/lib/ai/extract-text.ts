/**
 * Resume text extraction utilities.
 * Extracts plain text from PDF and DOCX files stored in Supabase Storage.
 *
 * Uses `unpdf` for PDF extraction — a lightweight library designed for
 * serverless environments (no DOM APIs, no canvas, no worker threads).
 */

import { extractText } from "unpdf";
import mammoth from "mammoth";
import { createServiceClient } from "@/lib/supabase/server";

export class TextExtractionError extends Error {
  readonly code: "FILE_NOT_FOUND" | "UNSUPPORTED_FORMAT" | "EXTRACTION_FAILED";

  constructor(
    message: string,
    code: "FILE_NOT_FOUND" | "UNSUPPORTED_FORMAT" | "EXTRACTION_FAILED"
  ) {
    super(message);
    this.name = "TextExtractionError";
    this.code = code;
  }
}

/**
 * Download a file from Supabase Storage and extract its plain text content.
 * Supports PDF and DOCX formats.
 */
export async function extractTextFromStorage(
  storagePath: string
): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from("resumes")
    .download(storagePath);

  if (error || !data) {
    throw new TextExtractionError(
      "Could not download resume from storage",
      "FILE_NOT_FOUND"
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const ext = storagePath.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return extractFromPDF(buffer);
  } else if (ext === "docx") {
    return extractFromDOCX(buffer);
  } else {
    throw new TextExtractionError(
      `Unsupported file format: .${ext}`,
      "UNSUPPORTED_FORMAT"
    );
  }
}

/**
 * Extract text from a PDF buffer using unpdf.
 * Works in serverless environments without DOM dependencies.
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { text: pages } = await extractText(new Uint8Array(buffer));

    // unpdf returns an array of strings, one per page
    const text = (Array.isArray(pages) ? pages.join("\n") : String(pages)).trim();

    if (!text || text.length < 50) {
      throw new TextExtractionError(
        "We had trouble reading your resume. You can try uploading a Word document version, or add your details manually.",
        "EXTRACTION_FAILED"
      );
    }

    return text;
  } catch (err) {
    if (err instanceof TextExtractionError) throw err;
    throw new TextExtractionError(
      "Failed to parse PDF file. The file may be corrupted or password-protected.",
      "EXTRACTION_FAILED"
    );
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim();

    if (!text || text.length < 50) {
      throw new TextExtractionError(
        "We had trouble reading your resume. The document appears to have very little text content.",
        "EXTRACTION_FAILED"
      );
    }

    return text;
  } catch (err) {
    if (err instanceof TextExtractionError) throw err;
    throw new TextExtractionError(
      "Failed to parse DOCX file. The file may be corrupted.",
      "EXTRACTION_FAILED"
    );
  }
}
