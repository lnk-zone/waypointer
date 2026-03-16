/**
 * Storage Bucket Setup Script
 *
 * Creates the waypointer-files bucket and folder structure in Supabase Storage.
 * Run once during project setup: npx tsx scripts/setup-storage.ts
 *
 * Bucket structure (from MP §10):
 *   waypointer-files/
 *     uploads/{employee_id}/    — Original uploaded resumes
 *     generated/{employee_id}/ — AI-generated resumes (PDF, DOCX)
 *     reports/{company_id}/    — Employer summary reports
 *
 * Access control: Bucket is private. Files accessed via presigned URLs with 1-hour expiry.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  process.stderr.write(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment\n"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupStorage() {
  const BUCKET_NAME = "waypointer-files";

  // Create bucket (private by default)
  const { error: bucketError } = await supabase.storage.createBucket(
    BUCKET_NAME,
    { public: false }
  );

  if (bucketError) {
    if (bucketError.message.includes("already exists")) {
      process.stdout.write(`Bucket "${BUCKET_NAME}" already exists\n`);
    } else {
      process.stderr.write(
        `Failed to create bucket: ${bucketError.message}\n`
      );
      process.exit(1);
    }
  } else {
    process.stdout.write(`Created bucket "${BUCKET_NAME}" (private)\n`);
  }

  // Create folder structure with placeholder files
  const folders = ["uploads/.gitkeep", "generated/.gitkeep", "reports/.gitkeep"];

  for (const path of folders) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, new Uint8Array(0), {
        contentType: "text/plain",
        upsert: true,
      });

    if (uploadError) {
      process.stderr.write(
        `Failed to create ${path}: ${uploadError.message}\n`
      );
    } else {
      process.stdout.write(`Created folder: ${path.replace("/.gitkeep", "/")}\n`);
    }
  }

  process.stdout.write("Storage setup complete\n");
}

setupStorage();
