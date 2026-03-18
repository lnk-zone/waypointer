import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Simple query to verify Supabase connectivity
    const { error } = await supabase.from("_health_check").select("*").limit(1);

    // The table doesn't need to exist — a "relation does not exist" error
    // still proves the connection works. Only network/auth errors mean failure.
    const isTableMissing =
      error?.message?.includes("does not exist") ||
      error?.message?.includes("Could not find");

    if (error && !isTableMissing) {
      return NextResponse.json(
        {
          error: {
            code: "SUPABASE_CONNECTION_FAILED",
            message: "Failed to connect to Supabase",
            details: error.message,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "ok", supabase: "connected" },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: "Health check failed",
          details: message,
        },
      },
      { status: 503 }
    );
  }
}
