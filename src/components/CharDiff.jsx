// Character-level diff rendering.
//   Fully mismatched chars: red (Excel) or blue (CSV) background, white text.
//   Case-only differences (LCS matched case-insensitively but casing differs): yellow background.

import { charDiff } from "../lib/fuzzy.js";

function renderChars(chars, side, pairedChars) {
  const bg = side === "excel" ? "bg-red-500" : "bg-blue-500";
  // Build index: matched char position in `chars` -> corresponding char in pairedChars.
  // Both arrays are parallel (same string length, same match flags) only when lengths equal,
  // so we align by iterating matched positions in order.
  const myMatched = chars.map((c, i) => (c.match ? i : null)).filter((i) => i !== null);
  const theirMatched = pairedChars
    ? pairedChars.map((c, i) => (c.match ? i : null)).filter((i) => i !== null)
    : [];
  // Map from our matched index -> their matched char
  const pairMap = new Map();
  myMatched.forEach((myIdx, seq) => {
    const theirIdx = theirMatched[seq];
    if (theirIdx !== undefined) pairMap.set(myIdx, pairedChars[theirIdx].ch);
  });

  return chars.map((c, i) => {
    const isSpace = c.ch === " ";
    // Render spaces as a visible middle-dot so trailing/leading spaces are obvious.
    const display = isSpace ? "·" : c.ch;
    if (!c.match) {
      return (
        <span key={i} className={`font-mono ${bg} text-white rounded-sm`}>
          {display}
        </span>
      );
    }
    const pairedCh = pairMap.get(i);
    const caseMismatch = pairedCh !== undefined && c.ch !== pairedCh;
    if (caseMismatch) {
      return (
        <span key={i} className="font-mono bg-yellow-300 text-black rounded-sm">
          {display}
        </span>
      );
    }
    // Matched spaces: show dot in light gray so they're visible but not alarming.
    if (isSpace) {
      return (
        <span key={i} className="font-mono text-slate-400">
          {display}
        </span>
      );
    }
    return <span key={i} className="font-mono">{display}</span>;
  });
}

// Returns { excel, csv } React nodes with character-level highlighting.
export function charDiffNodes(excelValue, csvValue) {
  const { a, b } = charDiff(excelValue, csvValue);
  return {
    excel: <span className="break-all">{renderChars(a, "excel", b)}</span>,
    csv: <span className="break-all">{renderChars(b, "csv", a)}</span>,
  };
}
