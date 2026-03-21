/**
 * Direct Link Resolver — Tier 3: LLM Resolver (No Playwright)
 *
 * Fetches a company's careers page HTML with browser-like headers, extracts all
 * anchor links and visible page text, then sends the data to Claude Haiku to
 * identify the best-matching direct application URL.
 *
 * This tier is used when Tier 1 (ATS API) and Tier 2 (HTML parse) both fail —
 * typically for lightly JS-rendered pages or non-standard career page layouts
 * that regex cannot reliably parse.
 *
 * Cost: ~$0.0005–0.001 per resolution (Claude Haiku input + output tokens)
 * Timeout: 15 seconds for the HTTP fetch; Anthropic SDK default for the LLM call
 * Max tokens: 400 (output)
 */

import Anthropic from "@anthropic-ai/sdk";
import { BROWSER_HEADERS } from "./constants";
import type { ResolvedJob } from "./types";

// ─── Anthropic client (singleton-like; re-used across calls in the same process) ─

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Model identifier ─────────────────────────────────────────────────────────

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageLink {
  href: string;
  text: string;
}

interface LLMMatch {
  title: string;
  apply_url: string;
}

interface LLMResponse {
  matches: LLMMatch[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a potentially relative `href` to an absolute URL using `baseUrl` as
 * context.  Returns the original `href` unchanged when parsing fails.
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/**
 * Extract all `<a href>` links with their visible text content from an HTML
 * string.  Inner HTML tags are stripped to expose only the display text.
 *
 * @param html    - Raw HTML string.
 * @param baseUrl - Page URL used to resolve relative hrefs.
 * @returns Array of objects with absolute `href` and cleaned `text`.
 */
function extractLinks(html: string, baseUrl: string): PageLink[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: PageLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = resolveUrl(match[1], baseUrl);
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (text.length > 0 && text.length < 200) {
      links.push({ href, text });
    }
  }

  return links;
}

/**
 * Strip all HTML tags from a string to produce plain visible text.
 * Collapses runs of whitespace to single spaces.
 */
function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the LLM prompt for finding the best-matching job application URL.
 */
function buildPrompt(
  employerName: string,
  targetTitle: string,
  careersUrl: string,
  links: PageLink[],
  pageText: string
): string {
  return `Find the direct application URL for this job:

Company: ${employerName}
Target job title: "${targetTitle}"
Careers page: ${careersUrl}

Here are all the links found on the page:
${JSON.stringify(links.slice(0, 100), null, 2)}

Page text excerpt:
${pageText.substring(0, 5000)}

Find the link that best matches "${targetTitle}" and leads to the actual application page on ${employerName}'s own website or their ATS (Greenhouse, Lever, Workday, etc).

NEVER return links to LinkedIn, Indeed, Glassdoor, or any job board aggregator.

Return JSON only:
{
  "matches": [
    {"title": "exact title from page", "apply_url": "the direct URL"}
  ]
}

If no match found, return: {"matches": []}`;
}

/**
 * Strip markdown code fences (e.g. ```json ... ```) from the model response
 * so that `JSON.parse` can handle it cleanly.
 */
function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempt to resolve a direct application URL by sending careers page HTML to
 * Claude Haiku for analysis.
 *
 * @param careersUrl   - The careers / jobs page URL to fetch and analyse.
 * @param targetTitle  - The job title we are trying to match.
 * @param employerName - Human-readable employer name (e.g. `"Stripe"`), used
 *                       in the prompt context.
 * @returns The best-matching `ResolvedJob` including LLM token counts for cost
 *          tracking, or `null` when the page cannot be fetched, the LLM returns
 *          no matches, or any error occurs.
 */
export async function resolveViaTier3(
  careersUrl: string,
  targetTitle: string,
  employerName: string
): Promise<ResolvedJob | null> {
  // ── Fetch the careers page ─────────────────────────────────────────────────
  let html: string;
  try {
    const resp = await fetch(careersUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) return null;

    html = await resp.text();
  } catch {
    return null;
  }

  // ── Extract links and page text ───────────────────────────────────────────
  const links = extractLinks(html, careersUrl);
  const pageText = extractPageText(html);

  // ── Build and send the LLM prompt ─────────────────────────────────────────
  let llmResponse: Anthropic.Message;
  try {
    llmResponse = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: buildPrompt(
            employerName,
            targetTitle,
            careersUrl,
            links,
            pageText
          ),
        },
      ],
    });
  } catch {
    return null;
  }

  // ── Parse the LLM response ────────────────────────────────────────────────
  try {
    const firstContent = llmResponse.content[0];
    if (firstContent.type !== "text") return null;

    const raw = stripMarkdownFences(firstContent.text);
    const parsed = JSON.parse(raw) as LLMResponse;

    if (!parsed.matches || parsed.matches.length === 0) return null;

    const best = parsed.matches[0];

    return {
      title: best.title,
      applyUrl: best.apply_url,
      location: null,
      llmTokens: {
        input: llmResponse.usage.input_tokens,
        output: llmResponse.usage.output_tokens,
      },
    };
  } catch {
    return null;
  }
}
