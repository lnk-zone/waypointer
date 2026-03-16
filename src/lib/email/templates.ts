/**
 * Day Zero Email Kit — 4 pre-built, tone-calibrated email templates.
 *
 * Per MP §4:
 * 1. Standard Invitation — calm, respectful, practical
 * 2. Re-engagement (72h) — gentle, no pressure
 * 3. Weekly Nudge — supportive, action-oriented
 * 4. 30-Day Check-in — warm, encouraging
 *
 * CRITICAL CONSTRAINTS (CLAUDE.md Rule 6):
 * - Sent from "Waypointer", never from the employer's domain
 * - Never use "layoff" or "termination" — use "career transition" and "next step"
 * - All emails include an unsubscribe link
 * - Employer logo and custom message appear when branded
 */

// ─── Types ────────────────────────────────────────────────────────────

export type EmailTemplateType =
  | "invitation"
  | "reengagement_72h"
  | "weekly_nudge"
  | "thirty_day_checkin";

export interface EmailTemplateData {
  recipientName: string;
  companyName: string;
  companyLogoUrl?: string | null;
  customMessage?: string | null;
  activationLink?: string;
  loginLink?: string;
  unsubscribeLink: string;
  // Tracking
  trackingPixelUrl?: string;
  clickTrackBaseUrl?: string;
  emailSendId?: string;
  // Template-specific
  jobMatchCount?: number;
  progressSummary?: string;
  daysSinceActivation?: number;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

// ─── Shared Styles ────────────────────────────────────────────────────

const WAYPOINTER_BLUE = "#2563EB";
const GRAY_100 = "#F3F4F6";
const GRAY_500 = "#6B7280";
const GRAY_700 = "#374151";
const GRAY_900 = "#111827";

function baseLayout(content: string, data: EmailTemplateData): string {
  const logoBlock = data.companyLogoUrl
    ? `<img src="${escapeHtml(data.companyLogoUrl)}" alt="${escapeHtml(data.companyName)}" style="max-height:48px;max-width:180px;margin-bottom:12px;" />`
    : "";

  const customMessageBlock =
    data.customMessage
      ? `<div style="background:${GRAY_100};border-radius:8px;padding:16px;margin-bottom:24px;font-size:14px;color:${GRAY_700};line-height:1.6;">${escapeHtml(data.customMessage)}</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Waypointer</title>
</head>
<body style="margin:0;padding:0;background:${GRAY_100};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${GRAY_100};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              ${logoBlock}
              <div style="font-size:16px;font-weight:600;color:${WAYPOINTER_BLUE};letter-spacing:0.5px;">WAYPOINTER</div>
            </td>
          </tr>
          <!-- Custom message -->
          ${customMessageBlock ? `<tr><td style="padding:24px 32px 0;">${customMessageBlock}</td></tr>` : ""}
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${GRAY_500};">
                Sent by Waypointer on behalf of ${escapeHtml(data.companyName)}
              </p>
              <a href="${escapeHtml(data.unsubscribeLink)}" style="font-size:12px;color:${GRAY_500};text-decoration:underline;">
                Unsubscribe from these emails
              </a>
              ${data.trackingPixelUrl ? `<img src="${escapeHtml(data.trackingPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding:24px 0 8px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;background:${WAYPOINTER_BLUE};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
          ${escapeHtml(text)}
        </a>
      </td>
    </tr>
  </table>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Template 1: Standard Invitation ──────────────────────────────────

function renderInvitation(data: EmailTemplateData): RenderedEmail {
  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${GRAY_900};line-height:1.3;">
      ${escapeHtml(data.companyName)} has arranged career transition support for you
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      Hi ${escapeHtml(data.recipientName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      As part of your next step, ${escapeHtml(data.companyName)} has provided you with access to
      Waypointer — a career transition platform designed to help you move forward with confidence.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      Here's what you can do:
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:${GRAY_700};line-height:1.8;">
      <li>Get clarity on your ideal next roles</li>
      <li>Build tailored resumes for each target path</li>
      <li>Find matching job opportunities</li>
      <li>Practice interviews with AI coaching</li>
    </ul>
    <p style="margin:0 0 8px;font-size:14px;color:${GRAY_500};">
      Your first session takes about 15–20 minutes.
    </p>
    ${ctaButton("Start Your Transition Plan", data.activationLink ?? "#")}
  `;

  return {
    subject: `${data.companyName} has provided you with career transition support`,
    html: baseLayout(content, data),
  };
}

// ─── Template 2: Re-engagement (72h) ─────────────────────────────────

function renderReengagement(data: EmailTemplateData): RenderedEmail {
  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${GRAY_900};line-height:1.3;">
      Your transition support is ready when you are
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      Hi ${escapeHtml(data.recipientName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      We wanted to let you know that your career transition support through Waypointer is
      still available and ready for you whenever you'd like to get started.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      In just 20 minutes, you could identify your ideal next roles and start building
      a tailored resume. There's no rush — your access is here whenever you need it.
    </p>
    ${ctaButton("Get Started", data.activationLink ?? data.loginLink ?? "#")}
  `;

  return {
    subject: "Your transition support is ready when you are",
    html: baseLayout(content, data),
  };
}

// ─── Template 3: Weekly Nudge ─────────────────────────────────────────

function renderWeeklyNudge(data: EmailTemplateData): RenderedEmail {
  const jobLine = data.jobMatchCount && data.jobMatchCount > 0
    ? `<p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
        You have <strong>${data.jobMatchCount} new job match${data.jobMatchCount > 1 ? "es" : ""}</strong> waiting for you.
        Log in to review them and keep your momentum going.
      </p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
        Check in to review your progress and keep moving forward.
        Small, consistent steps make the biggest difference.
      </p>`;

  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${GRAY_900};line-height:1.3;">
      You have new job matches waiting
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      Hi ${escapeHtml(data.recipientName)},
    </p>
    ${jobLine}
    ${ctaButton("View Your Matches", data.loginLink ?? "#")}
  `;

  return {
    subject: "You have new job matches waiting",
    html: baseLayout(content, data),
  };
}

// ─── Template 4: 30-Day Check-in ──────────────────────────────────────

function renderThirtyDayCheckin(data: EmailTemplateData): RenderedEmail {
  const progressBlock = data.progressSummary
    ? `<div style="background:${GRAY_100};border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:${GRAY_700};line-height:1.6;">
        <strong style="color:${GRAY_900};">Your progress so far:</strong><br/>
        ${escapeHtml(data.progressSummary)}
      </div>`
    : "";

  const content = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${GRAY_900};line-height:1.3;">
      How's your search going?
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      Hi ${escapeHtml(data.recipientName)},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      It's been about 30 days since you started using Waypointer. We'd love to know
      how things are going — your feedback helps us support you better.
    </p>
    ${progressBlock}
    <p style="margin:0 0 16px;font-size:15px;color:${GRAY_700};line-height:1.6;">
      If you haven't tried a mock interview yet, it's a great way to build confidence
      before real conversations with hiring managers.
    </p>
    ${ctaButton("Check In & Continue", data.loginLink ?? "#")}
  `;

  return {
    subject: "How's your search going?",
    html: baseLayout(content, data),
  };
}

// ─── Template Renderer ────────────────────────────────────────────────

export function renderEmailTemplate(
  templateType: EmailTemplateType,
  data: EmailTemplateData
): RenderedEmail {
  switch (templateType) {
    case "invitation":
      return renderInvitation(data);
    case "reengagement_72h":
      return renderReengagement(data);
    case "weekly_nudge":
      return renderWeeklyNudge(data);
    case "thirty_day_checkin":
      return renderThirtyDayCheckin(data);
    default: {
      const _exhaustive: never = templateType;
      throw new Error(`Unknown email template: ${_exhaustive}`);
    }
  }
}
