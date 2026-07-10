// Collapsible panel for one sheet's results. Issues shown first; matched
// entries hidden behind a toggle.

import { useState } from "react";
import IssueCard from "./IssueCard.jsx";

function Badge({ count, cls, label }) {
  if (count === 0) return null;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {count} {label}
    </span>
  );
}

export default function SheetAccordion({ sheet, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showMatched, setShowMatched] = useState(false);

  const issueCount =
    sheet.mismatches.length + sheet.notInCsv.length + sheet.notInExcel.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}>
            ▶
          </span>
          <span className="font-semibold text-slate-800 truncate">{sheet.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Badge count={sheet.mismatches.length} label="mismatch" cls="bg-red-100 text-red-700" />
          <Badge count={sheet.notInCsv.length} label="not in CSV" cls="bg-amber-100 text-amber-700" />
          <Badge count={sheet.notInExcel.length} label="not in Excel" cls="bg-orange-100 text-orange-700" />
          <Badge count={sheet.matched.length} label="matched" cls="bg-green-100 text-green-700" />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {issueCount === 0 && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              No issues — every entry on this sheet matched.
            </p>
          )}

          {sheet.mismatches.map((m, i) => (
            <IssueCard key={`mm${i}`} type="mismatch" entry={m.entry} diffs={m.diffs} />
          ))}
          {sheet.notInCsv.map((m, i) => (
            <IssueCard key={`nc${i}`} type="notInCsv" entry={m.entry} suggestion={m.suggestion} />
          ))}
          {sheet.notInExcel.map((m, i) => (
            <IssueCard key={`ne${i}`} type="notInExcel" entry={m.entry} suggestion={m.suggestion} />
          ))}

          {sheet.matched.length > 0 && (
            <div className="pt-1">
              <button
                onClick={() => setShowMatched((s) => !s)}
                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                {showMatched ? "Hide" : "Show"} {sheet.matched.length} matched{" "}
                {sheet.matched.length === 1 ? "entry" : "entries"}
              </button>
              {showMatched && (
                <div className="space-y-2 mt-2">
                  {sheet.matched.map((m, i) => (
                    <IssueCard key={`ok${i}`} type="matched" entry={m.entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
