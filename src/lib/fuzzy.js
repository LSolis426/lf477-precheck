// Fuzzy match suggestions + character-level diff highlighting.

import { IDENTITY_KEYS } from "./columns.js";

// Longest Common Subsequence length (case-insensitive).
function lcsLength(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) curr[j] = prev[j - 1] + 1;
      else curr[j] = Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Similarity in [0,1] = LCS length / max length, case-insensitive.
export function stringSimilarity(a, b) {
  const sa = String(a ?? "").toLowerCase();
  const sb = String(b ?? "").toLowerCase();
  const maxLen = Math.max(sa.length, sb.length);
  if (maxLen === 0) return 1;
  return lcsLength(sa, sb) / maxLen;
}

// Composite drug-similarity score: 70% drug name, 30% dosing name.
export function entryScore(a, b) {
  return (
    stringSimilarity(a.drug, b.drug) * 0.7 +
    stringSimilarity(a.dosing, b.dosing) * 0.3
  );
}

// Find the best fuzzy candidate (from `candidates`) for `target`.
// Requires identical Care Area. Returns { candidate, score } or null.
export function findSuggestion(target, candidates, threshold = 0.55) {
  let best = null;
  let bestScore = 0;
  for (const cand of candidates) {
    if (cand.careArea !== target.careArea) continue; // care area must match
    const score = entryScore(target, cand);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  if (best && bestScore > threshold) {
    return { candidate: best, score: bestScore };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Character-level diff via LCS alignment.
// Returns two arrays of { ch, match } describing each string's characters.
// Characters NOT part of the common subsequence are flagged match:false.
// Comparison is case-insensitive (matching the similarity metric), but the
// original characters are preserved for display.
// ---------------------------------------------------------------------------
export function charDiff(aStr, bStr) {
  const a = String(aStr ?? "");
  const b = String(bStr ?? "");
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const m = a.length;
  const n = b.length;

  // Full LCS DP table for backtracking.
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (la[i - 1] === lb[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const aMatch = new Array(m).fill(false);
  const bMatch = new Array(n).fill(false);
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (la[i - 1] === lb[j - 1]) {
      aMatch[i - 1] = true;
      bMatch[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return {
    a: a.split("").map((ch, idx) => ({ ch, match: aMatch[idx] })),
    b: b.split("").map((ch, idx) => ({ ch, match: bMatch[idx] })),
  };
}

export { IDENTITY_KEYS };
