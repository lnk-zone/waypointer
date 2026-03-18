/**
 * GET /api/v1/email/track
 *
 * Email engagement tracking endpoint.
 * - ?type=open&id=<email_send_id> — tracking pixel (records opened_at)
 * - ?type=click&id=<email_send_id>&url=<destination> — click redirect (records clicked_at)
 *
 * Public endpoint — no auth required (triggered by email client).
 * Uses Edge Runtime — lightweight DB update + redirect.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// 1x1 transparent PNG pixel (base64)
const TRACKING_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");

  if (!id || !type) {
    return new NextResponse(null, { status: 400 });
  }

  // UUID format validation
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  if (type === "open") {
    // Record open — only set if not already set (first open)
    await supabase
      .from("email_sends")
      .update({ opened_at: now })
      .eq("id", id)
      .is("opened_at", null);

    // Return 1x1 transparent PNG
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  if (type === "click") {
    const destination = url.searchParams.get("url");
    if (!destination) {
      return new NextResponse(null, { status: 400 });
    }

    // Record click — only set if not already set (first click)
    await supabase
      .from("email_sends")
      .update({ clicked_at: now })
      .eq("id", id)
      .is("clicked_at", null);

    // Redirect to destination
    return NextResponse.redirect(destination, 302);
  }

  return new NextResponse(null, { status: 400 });
}
