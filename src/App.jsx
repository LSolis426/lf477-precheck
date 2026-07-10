import { useState, useMemo } from "react";
import DropZone from "./components/DropZone.jsx";
import ResultsSummary from "./components/ResultsSummary.jsx";
import SheetAccordion from "./components/SheetAccordion.jsx";
import { parseExcel, parseCsv } from "./lib/parse.js";
import { compareAll } from "./lib/compare.js";

function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function App() {
  const [excelFile, setExcelFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [excelParsed, setExcelParsed] = useState(null);
  const [csvParsed, setCsvParsed] = useState(null);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleExcel(file) {
    setError(null);
    setResults(null);
    setExcelFile(file);
    try {
      const buf = await readArrayBuffer(file);
      const parsed = parseExcel(buf);
      if (!parsed.isDers) {
        setError(
          `"${file.name}" doesn't look like a DERS template (no "Care Area" header found in cell B3).`
        );
        setExcelParsed(null);
        return;
      }
      setExcelParsed(parsed);
    } catch (e) {
      setError(`Failed to read Excel file: ${e.message || e}`);
      setExcelParsed(null);
    }
  }

  async function handleCsv(file) {
    setError(null);
    setResults(null);
    setCsvFile(file);
    try {
      const buf = await readArrayBuffer(file);
      const parsed = parseCsv(buf);
      setCsvParsed(parsed);
    } catch (e) {
      setError(`Failed to read CSV file: ${e.message || e}`);
      setCsvParsed(null);
    }
  }

  function runCompare(smartMode) {
    if (!excelParsed || !csvParsed) return;
    setBusy(true);
    // Defer so the busy state can paint for large files.
    setTimeout(() => {
      try {
        const res = compareAll(excelParsed, csvParsed, smartMode);
        setResults(res);
      } catch (e) {
        setError(`Comparison failed: ${e.message || e}`);
      } finally {
        setBusy(false);
      }
    }, 0);
  }

  const ready = excelParsed && csvParsed;

  const allClear = useMemo(() => {
    if (!results) return false;
    const s = results.summary;
    return s.mismatches === 0 && s.notInCsv === 0 && s.notInExcel === 0 && s.total > 0;
  }, [results]);

  const excelStats = excelParsed
    ? {
        sheets: excelParsed.sheets.length,
        entries: excelParsed.sheets.reduce((n, s) => n + s.entries.length, 0),
      }
    : null;

  return (
    <div className="min-h-screen text-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            DERS Drug Template Comparator
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Compare a DERS pump-library Excel template against a CSV export to
            verify every drug entry. Everything runs in your browser — no files
            are uploaded anywhere.
          </p>
        </header>

        {/* Upload */}
        <div className="grid sm:grid-cols-2 gap-4">
          <DropZone
            label="DERS Template (.xlsx)"
            accept=".xlsx,.xls"
            file={excelFile}
            onFile={handleExcel}
            tone="excel"
          />
          <DropZone
            label="Pump Export (.csv)"
            accept=".csv"
            file={csvFile}
            onFile={handleCsv}
            tone="csv"
          />
        </div>

        {/* Parse feedback */}
        {(excelStats || csvParsed) && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            {excelStats && (
              <span>
                Excel: <b className="text-slate-700">{excelStats.entries}</b> entries
                across <b className="text-slate-700">{excelStats.sheets}</b>{" "}
                {excelStats.sheets === 1 ? "sheet" : "sheets"}
              </span>
            )}
            {csvParsed && (
              <span>
                CSV: <b className="text-slate-700">{csvParsed.rows.length}</b> rows
              </span>
            )}
          </div>
        )}

        {/* CSV header mapping diagnostics */}
        {csvParsed && csvParsed.unmappedHeaders?.length > 0 && (
          <details className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <summary className="cursor-pointer font-medium">
              {csvParsed.unmappedHeaders.length} CSV column
              {csvParsed.unmappedHeaders.length === 1 ? "" : "s"} not mapped to a
              template field
            </summary>
            <div className="mt-1 break-all">
              {csvParsed.unmappedHeaders.join(", ")}
            </div>
          </details>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Compare buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            disabled={!ready || busy}
            onClick={() => runCompare(true)}
            className="flex-1 rounded-lg bg-indigo-600 text-white font-semibold py-2.5 px-4 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Compare — ignore unit aliases
          </button>
          <button
            disabled={!ready || busy}
            onClick={() => runCompare(false)}
            className="flex-1 rounded-lg bg-teal-600 text-white font-semibold py-2.5 px-4 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Compare — everything exactly
          </button>
        </div>

        {busy && <p className="mt-4 text-sm text-slate-500">Comparing…</p>}

        {/* Results */}
        {results && (
          <div className="mt-8 space-y-4">
            {/* Mode badge */}
            <div>
              {results.smartMode ? (
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  Mode: ignore unit aliases
                </span>
              ) : (
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-teal-100 text-teal-700">
                  Mode: everything exactly
                </span>
              )}
            </div>

            {allClear && (
              <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 font-medium">
                ✓ All {results.summary.total} entries match perfectly — files are
                identical.
              </div>
            )}

            <ResultsSummary summary={results.summary} />

            <div className="space-y-3">
              {results.sheets.map((sheet, i) => {
                const hasIssues =
                  sheet.mismatches.length +
                    sheet.notInCsv.length +
                    sheet.notInExcel.length >
                  0;
                return (
                  <SheetAccordion key={sheet.name + i} sheet={sheet} defaultOpen={hasIssues} />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
