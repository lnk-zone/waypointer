/**
 * Direct Link Resolver — Fuzzy Title Matching
 *
 * Provides Jaccard-similarity-based fuzzy matching for job titles
 * with a keyword bonus for domain-relevant terms (e.g. "engineer",
 * "senior", "director"). Used by ATS parsers and the HTML page parser
 * to identify the best-matching job listing for a target title.
 */

const KEY_WORDS = [
  "engineer", "manager", "analyst", "designer", "developer",
  "director", "lead", "senior", "staff", "principal", "vp",
  "product", "software", "data", "marketing", "sales",
  "consultant", "specialist", "coordinator", "associate",
  "architect", "scientist", "administrator",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return a similarity score in [0, 1] between two job titles.
 *
 * Scoring:
 *   1.0  — exact match (after normalisation)
 *   0.9  — one title contains the other
 *   else — Jaccard word overlap + 0.1 per shared KEY_WORD, capped at 1.0
 */
export function fuzzyMatchScore(
  candidateTitle: string,
  targetTitle: string
): number {
  const candidate = normalize(candidateTitle);
  const target = normalize(targetTitle);

  if (candidate === target) return 1.0;
  if (candidate.includes(target) || target.includes(candidate)) return 0.9;

  const candidateSet = new Set(candidate.split(" "));
  const targetSet = new Set(target.split(" "));

  // Intersection: unique words in candidate that also appear in target
  const intersectionSize = Array.from(candidateSet).filter((w) =>
    targetSet.has(w)
  ).length;

  // Union: all unique words across both titles
  const unionSet = new Set(
    Array.from(candidateSet).concat(Array.from(targetSet))
  );
  const unionSize = unionSet.size;

  const keyMatches = KEY_WORDS.filter(
    (kw) => candidateSet.has(kw) && targetSet.has(kw)
  ).length;

  const jaccard = intersectionSize / unionSize;
  const keyBonus = keyMatches * 0.1;

  return Math.min(1.0, jaccard + keyBonus);
}

/**
 * Return true when the fuzzy match score exceeds the 0.4 acceptance threshold.
 */
export function fuzzyMatch(
  candidateTitle: string,
  targetTitle: string
): boolean {
  return fuzzyMatchScore(candidateTitle, targetTitle) > 0.4;
}
