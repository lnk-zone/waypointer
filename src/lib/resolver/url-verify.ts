/**
 * Direct Link Resolver — URL Verification
 *
 * Confirms a resolved direct-apply URL is reachable before it is served
 * to the user. Uses a HEAD request first (cheap); falls back to GET if
 * the server rejects HEAD (HTTP 405 / 403).
 *
 * Returns false on any network error or non-2xx response so callers can
 * still serve the URL with `isVerified: false` rather than crashing.
 */

import { BROWSER_HEADERS } from "./constants";

/**
 * Attempt to verify that `url` returns a successful HTTP response.
 *
 * Strategy:
 *   1. HEAD request with an 8-second timeout.
 *   2. If the server responds 405 (Method Not Allowed) or 403 (Forbidden),
 *      retry with GET — some career-page servers reject HEAD unconditionally.
 *   3. Any fetch error (timeout, DNS failure, TLS error) returns false.
 *
 * @param url - The fully-qualified URL to probe.
 * @returns `true` if the URL is reachable and returns a 2xx status.
 */
export async function verifyUrl(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (resp.ok) return true;

    // Some sites block HEAD — retry with GET
    if (resp.status === 405 || resp.status === 403) {
      const getResp = await fetch(url, {
        method: "GET",
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      return getResp.ok;
    }

    return false;
  } catch {
    return false;
  }
}
