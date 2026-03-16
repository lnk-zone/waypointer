/**
 * Tracked email sending — creates tracking record, renders template with
 * tracking URLs, sends via Resend, updates record on failure.
 *
 * This is the core function that all email-sending flows use.
 * It ensures every email is tracked in the database for deduplication and analytics.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./client";
import {
  renderEmailTemplate,
  type EmailTemplateType,
  type EmailTemplateData,
} from "./templates";

// ─── Types ────────────────────────────────────────────────────────────

export interface SendTrackedEmailParams {
  supabase: SupabaseClient;
  seatId: string;
  recipientEmail: string;
  templateType: EmailTemplateType;
  templateData: EmailTemplateData;
  baseUrl?: string;
}

export interface SendTrackedEmailResult {
  success: boolean;
  emailSendId?: string;
  messageId?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getBaseUrl(override?: string): string {
  if (override) return override;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "https://waypointer.com";
}

// ─── Main Function ────────────────────────────────────────────────────

export async function sendTrackedEmail(
  params: SendTrackedEmailParams
): Promise<SendTrackedEmailResult> {
  const {
    supabase,
    seatId,
    recipientEmail,
    templateType,
    templateData,
    baseUrl: baseUrlOverride,
  } = params;

  // 1. Create the email_sends record first to get the ID for tracking URLs
  const { data: emailSend, error: insertError } = await supabase
    .from("email_sends")
    .insert({
      seat_id: seatId,
      template_type: templateType,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !emailSend) {
    return {
      success: false,
      error: "Failed to create email tracking record",
    };
  }

  const emailSendId = (emailSend as unknown as { id: string }).id;
  const baseUrl = getBaseUrl(baseUrlOverride);
  const trackEndpoint = `${baseUrl}/api/v1/email/track`;

  // 2. Inject tracking URLs into template data
  const enrichedData: EmailTemplateData = {
    ...templateData,
    trackingPixelUrl: `${trackEndpoint}?type=open&id=${emailSendId}`,
    clickTrackBaseUrl: trackEndpoint,
    emailSendId,
  };

  // 3. Render the template
  const rendered = renderEmailTemplate(templateType, enrichedData);

  // 4. Send via Resend
  const result = await sendEmail({
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
  });

  if (!result.success) {
    // Clean up the tracking record since email wasn't delivered
    await supabase.from("email_sends").delete().eq("id", emailSendId);

    return {
      success: false,
      error: result.error ?? "Email delivery failed",
    };
  }

  return {
    success: true,
    emailSendId,
    messageId: result.messageId,
  };
}

// ─── Deduplication Check ──────────────────────────────────────────────

/**
 * Check if an email of this type has already been sent to this seat
 * within the given time window (hours).
 */
export async function hasRecentEmail(
  supabase: SupabaseClient,
  seatId: string,
  templateType: EmailTemplateType,
  withinHours: number = 24
): Promise<boolean> {
  const threshold = new Date(
    Date.now() - withinHours * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("email_sends")
    .select("id")
    .eq("seat_id", seatId)
    .eq("template_type", templateType)
    .gte("sent_at", threshold)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
