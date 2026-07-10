// A single issue (mismatch, not-in-csv, not-in-excel) or matched entry card.

import DiffTable from "./DiffTable.jsx";
import SuggestionBox from "./SuggestionBox.jsx";

const STATUS = {
  mismatch: { label: "Mismatch", cls: "bg-red-100 text-red-700 border-red-200" },
  notInCsv: { label: "Not in CSV", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  notInExcel: { label: "Not in Excel", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  matched: { label: "Matched", cls: "bg-green-100 text-green-700 border-green-200" },
};

function Identity({ entry }) {
  return (
    <div className="text-sm text-slate-600 flex flex-wrap items-center gap-1">
      <span className="font-semibold text-slate-800">{entry.careArea}</span>
      <span className="text-slate-300">›</span>
      <span className="font-semibold text-slate-800">
        {entry.drug || <span className="italic text-slate-400">(blank)</span>}
      </span>
      <span className="text-slate-300">›</span>
      <span className="text-slate-600">
        {entry.dosing || <span className="italic text-slate-400">(blank)</span>}
      </span>
    </div>
  );
}

export default function IssueCard({ type, entry, diffs, suggestion }) {
  const status = STATUS[type];
  const borderTone =
    type === "mismatch"
      ? "border-l-red-400"
      : type === "notInCsv"
      ? "border-l-amber-400"
      : type === "notInExcel"
      ? "border-l-orange-400"
      : "border-l-green-400";

  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 ${borderTone} bg-white p-3`}>
      <div className="flex items-start justify-between gap-3">
        <Identity entry={entry} />
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}
        >
          {status.label}
        </span>
      </div>

      {type === "mismatch" && diffs && diffs.length > 0 && (
        <DiffTable diffs={diffs} />
      )}

      {(type === "notInCsv" || type === "notInExcel") && (
        <SuggestionBox target={entry} suggestion={suggestion} />
      )}
    </div>
  );
}
