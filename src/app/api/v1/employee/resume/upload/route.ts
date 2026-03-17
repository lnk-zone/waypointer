import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  requireEmployee,
} from "@/lib/api/auth-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

/**
 * POST /api/v1/employee/resume/upload
 * Uploads a resume file to Supabase Storage and updates the employee profile.
 * Accepts multipart form data with a "file" field.
 * Employee-only endpoint.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const roleError = requireEmployee(auth);
  if (roleError) return roleError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "Invalid form data");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return apiError(ERROR_CODES.VALIDATION_ERROR, "No file provided");
  }

  // Extract file extension safely
  const nameParts = file.name.split(".");
  const ext = nameParts.length > 1 ? "." + nameParts.pop()!.toLowerCase() : "";

  // Validate file type — require valid MIME type OR valid extension
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
    return apiError(
      ERROR_CODES.INVALID_FILE_TYPE,
      "Only PDF and DOCX files are accepted"
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return apiError(
      ERROR_CODES.FILE_TOO_LARGE,
      "File too large. Maximum file size is 10MB."
    );
  }

  const supabase = createServiceClient();

  // Get employee profile
  const { data: employee, error: empError } = await supabase
    .from("employee_profiles")
    .select("id")
    .eq("auth_user_id", auth.user.id)
    .single();

  if (empError || !employee) {
    return apiError(ERROR_CODES.NOT_FOUND, "Employee profile not found");
  }

  // Upload to Supabase Storage
  const fileExtension = ext || ".pdf";
  const storagePath = `uploads/${employee.id}/resume-original${fileExtension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to upload file. Please try again."
    );
  }

  // Update employee profile with the upload path
  const { error: updateError } = await supabase
    .from("employee_profiles")
    .update({
      uploaded_resume_url: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employee.id);

  if (updateError) {
    return apiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to update profile with upload"
    );
  }

  const fileType = ext?.replace(".", "") || "pdf";

  return NextResponse.json({
    upload_url: storagePath,
    file_type: fileType,
    file_size_bytes: file.size,
  });
}
