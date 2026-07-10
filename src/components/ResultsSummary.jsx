// Four summary stat cards.

function Card({ label, value, tone }) {
  const tones = {
    green: "text-green-600",
    red: "text-red-600",
    neutral: "text-slate-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
      <div className={`text-3xl font-bold ${tones[tone]}`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

export default function ResultsSummary({ summary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card label="Matched" value={summary.matched} tone="green" />
      <Card label="Mismatches" value={summary.mismatches} tone={summary.mismatches > 0 ? "red" : "neutral"} />
      <Card label="Not in CSV" value={summary.notInCsv} tone={summary.notInCsv > 0 ? "red" : "neutral"} />
      <Card label="Not in Excel" value={summary.notInExcel} tone={summary.notInExcel > 0 ? "red" : "neutral"} />
    </div>
  );
}
