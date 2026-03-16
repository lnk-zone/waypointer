/**
 * Email sending client using Resend.
 *
 * All emails are sent from "Waypointer" per MP §4 and CLAUDE.md Rule 6.
 * Never sends from the employer's domain.
 */

import { Resend } from "resend";

// ─── Client ──────────────────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
    if (!apiKey) {
      throw new Error("EMAIL_PROVIDER_API_KEY is not configured");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// ─── Types ────────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Sender ──────────────────────────────────────────────────────────

const FROM_ADDRESS = "Waypointer <support@waypointer.com>";

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo && { replyTo: params.replyTo }),
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Email delivery failed",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
