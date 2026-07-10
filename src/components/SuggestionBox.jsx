// Fuzzy "possible match" box shown inside a missing-entry card.
// `target` is the entry that's missing; `suggestion` is the closest candidate
// found on the other side (with .score and .side).

import { charDiffNodes } from "./CharDiff.jsx";

export default function SuggestionBox({ target, suggestion }) {
  if (!suggestion) return null;

  const pct = Math.round(suggestion.score * 100);

  // The suggestion lives on the opposite side from the target. Determine which
  // value is "Excel" and which is "CSV" for consistent red/blue coloring.
  const excelEntry = suggestion.side === "excel" ? suggestion : target;
  const csvEntry = suggestion.side === "csv" ? suggestion : target;

  const drugDiff = charDiffNodes(excelEntry.drug, csvEntry.drug);
  const dosingDiff = charDiffNodes(excelEntry.dosing, csvEntry.dosing);

  return (
    <div className="mt-3 rounded-lg border border-purple-200 overflow-hidden">
      <div className="bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 tracking-wide">
        POSSIBLE MATCH FOUND ({pct}% SIMILAR)
      </div>
      <div className="bg-purple-50 p-3 space-y-2 text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
          <span className="text-purple-700 font-semibold">Drug</span>
          <div className="space-y-0.5">
            <div>
              <span className="text-red-600 font-semibold text-xs mr-1">Excel:</span>
              {drugDiff.excel}
            </div>
            <div>
              <span className="text-blue-600 font-semibold text-xs mr-1">CSV:</span>
              {drugDiff.csv}
            </div>
          </div>

          <span className="text-purple-700 font-semibold">Dosing</span>
          <div className="space-y-0.5">
            <div>
              <span className="text-red-600 font-semibold text-xs mr-1">Excel:</span>
              {dosingDiff.excel}
            </div>
            <div>
              <span className="text-blue-600 font-semibold text-xs mr-1">CSV:</span>
              {dosingDiff.csv}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
