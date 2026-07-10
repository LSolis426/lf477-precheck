// Comparison engine: diffs an Excel template against a CSV export.

import { COMPARE_COLUMNS, KEY_SEP } from "./columns.js";
import { valuesEqual } from "./normalize.js";
import { findSuggestion } from "./fuzzy.js";

// Compare the non-identity fields of two entries. Returns array of diffs.
function diffFields(excelEntry, csvRow, smartMode) {
  const diffs = [];
  for (const def of COMPARE_COLUMNS) {
    const ev = excelEntry.fields[def.key];
    const cv = csvRow.fields[def.key];
    if (!valuesEqual(def.key, ev, cv, smartMode)) {
      diffs.push({
        key: def.key,
        label: def.label,
        excelValue: ev,
        csvValue: cv,
      });
    }
  }
  return diffs;
}

// Compare one Excel sheet's entries against the (full) CSV row list.
function compareSheet(sheet, csvRows, smartMode) {
  // Care areas present in this sheet — use the normalized key so that
  // fixCareArea-transformed values (≤ spacing, mojibake) match on both sides.
  const sheetCareAreas = new Set(
    sheet.entries.map((e) => e.key.split(KEY_SEP)[0]).filter(Boolean)
  );

  // Filter CSV rows to those whose care area belongs to this sheet.
  const filteredCsv = csvRows.filter((r) =>
    sheetCareAreas.has(r.key.split(KEY_SEP)[0])
  );


  const csvByKey = new Map();
  for (const r of filteredCsv) csvByKey.set(r.key, r);

  const excelByKey = new Map();
  for (const e of sheet.entries) excelByKey.set(e.key, e);

  const matched = [];
  const mismatches = [];
  const notInCsv = [];
  const notInExcel = [];

  // Excel-driven pass.
  for (const entry of sheet.entries) {
    const csvRow = csvByKey.get(entry.key);
    if (csvRow) {
      const diffs = diffFields(entry, csvRow, smartMode);
      if (diffs.length === 0) {
        matched.push({ entry });
      } else {
        mismatches.push({ entry, diffs });
      }
    } else {
      const sug = findSuggestion(entry, filteredCsv);
      notInCsv.push({
        entry,
        suggestion: sug
          ? { ...sug.candidate, score: sug.score, side: "csv" }
          : null,
      });
    }
  }

  // CSV-driven pass: rows present in (filtered) CSV but absent from Excel.
  for (const row of filteredCsv) {
    if (!excelByKey.has(row.key)) {
      const sug = findSuggestion(row, sheet.entries);
      notInExcel.push({
        entry: row,
        suggestion: sug
          ? { ...sug.candidate, score: sug.score, side: "excel" }
          : null,
      });
    }
  }

  return {
    name: sheet.name,
    matched,
    mismatches,
    notInCsv,
    notInExcel,
  };
}

export function compareAll(excelParsed, csvParsed, smartMode) {
  const sheets = excelParsed.sheets.map((sheet) =>
    compareSheet(sheet, csvParsed.rows, smartMode)
  );

  const summary = {
    matched: 0,
    mismatches: 0,
    notInCsv: 0,
    notInExcel: 0,
    total: 0,
  };
  for (const s of sheets) {
    summary.matched += s.matched.length;
    summary.mismatches += s.mismatches.length;
    summary.notInCsv += s.notInCsv.length;
    summary.notInExcel += s.notInExcel.length;
  }
  summary.total =
    summary.matched + summary.mismatches + summary.notInCsv + summary.notInExcel;

  return { sheets, summary, smartMode };
}
