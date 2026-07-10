// File parsing for DERS Excel templates and CSV pump exports.

import * as XLSX from "xlsx";
import { COLUMNS, IDENTITY_KEYS, KEY_SEP, TIME_KEYS } from "./columns.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function secondsToHMS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function isEmptyVal(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

// Fix UTF-8-as-Latin-1 mojibake for the less-than-or-equal (U+2264)
// and greater-than-or-equal (U+2265) signs.
// When UTF-8 bytes E2 89 A4 / E2 89 A5 are misread as Latin-1 they become
// three chars: U+00E2, U+0089 (control), U+00A4 or U+00A5.
const RX_MOJI_LE = new RegExp("\u00e2\u0089\u00a4", "g");
const RX_MOJI_GE = new RegExp("\u00e2\u0089\u00a5", "g");

export function fixMojibake(s) {
  if (s == null) return s;
  return String(s).replace(RX_MOJI_LE, "\u2264").replace(RX_MOJI_GE, "\u2265");
}

// Normalize care area strings so cosmetic differences don't break key matching:
// - mojibake for the <= and >= signs
// - Optional spaces around them: "Pediatric <=40KG" == "Pediatric<=40KG"
function fixCareArea(s) {
  return fixMojibake(String(s))
    .replace(/\s*\u2264\s*/g, "\u2264")
    .replace(/\s*\u2265\s*/g, "\u2265");
}

// Normalize drug/dosing name strings: fix mojibake, then normalize optional
// spaces around ≤/≥ (e.g. "≤ 125 kg" == "≤125 kg").
function fixDosingName(s) {
  if (s == null) return s;
  return fixMojibake(String(s))
    .replace(/\s*≤\s*/g, "≤ ")
    .replace(/\s*≥\s*/g, "≥ ");
}

// Build the unique drug key: Care Area trimmed; Drug and Dosing NOT trimmed.
export function makeKey(careArea, drug, dosing) {
  const ca = fixCareArea(String(careArea ?? "").trim());
  return `${ca}${KEY_SEP}${fixDosingName(drug) ?? ""}${KEY_SEP}${fixDosingName(dosing) ?? ""}`;
}

function startsWithRateMode(drug) {
  return String(drug ?? "")
    .trim()
    .toLowerCase()
    .startsWith("rate mode");
}

// ---------------------------------------------------------------------------
// Excel template parsing
// ---------------------------------------------------------------------------
//
// Returns { sheets: [{ name, entries: [...] }], isDers }
// Each entry: { sheet, rowNum, careArea, drug, dosing, key, fields:{key:raw} }

export function parseExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const result = { sheets: [], isDers: false };

  // Detect: a DERS template has B3 (r=2,c=1) containing "care area" on at
  // least one sheet.
  const dersSheet = (ws) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 2, c: 1 })];
    return cell && String(cell.v ?? "").toLowerCase().includes("care area");
  };

  let anyDers = false;
  for (const name of wb.SheetNames) {
    if (dersSheet(wb.Sheets[name])) anyDers = true;
  }
  result.isDers = anyDers;
  if (!anyDers) return result;

  let lastCareAreaCrossSheet = null; // for overflow-sheet inheritance

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);

    // Decide whether this sheet carries drug data. Primary sheets match B3;
    // overflow sheets may not but contain drug names in col 3 (index 2).
    let hasDrugData = false;
    for (let r = 3; r <= range.e.r; r++) {
      const c = ws[XLSX.utils.encode_cell({ r, c: 2 })];
      if (c && !isEmptyVal(c.v)) {
        hasDrugData = true;
        break;
      }
    }
    if (!dersSheet(ws) && !hasDrugData) continue; // skip unrelated sheets

    // First pass: read raw rows positionally.
    const rawRows = [];
    for (let r = 3; r <= range.e.r; r++) {
      const fields = {};
      let careAreaRaw = null;
      let drug = null;
      let dosing = null;
      for (const def of COLUMNS) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: def.col - 1 })];
        let value = cell ? cell.v : null;

        // Time columns: convert positive Excel serials to HH:MM:SS.
        if (TIME_KEYS.has(def.key) && cell && cell.t === "n" && cell.v > 0) {
          value = secondsToHMS(cell.v * 86400);
        }

        if (def.key === "careArea") careAreaRaw = value;
        else if (def.key === "drug") drug = value;
        else if (def.key === "dosing") dosing = value;
        else fields[def.key] = value;
      }
      rawRows.push({ r, careAreaRaw, drug, dosing, fields });
    }

    // Determine whether this whole sheet has ANY care area value.
    const sheetHasCareArea = rawRows.some((row) => !isEmptyVal(row.careAreaRaw));

    // Care-area fill-down. Seed from previous sheet only if this sheet has
    // no care area values at all (overflow sheet inheritance).
    let lastCareArea = sheetHasCareArea ? null : lastCareAreaCrossSheet;

    const entries = [];
    for (const row of rawRows) {
      // Skip rows with no drug data.
      if (isEmptyVal(row.drug)) continue;

      let careArea = row.careAreaRaw;
      if (!isEmptyVal(careArea)) {
        lastCareArea = fixCareArea(String(careArea).trim());
      } else if (lastCareArea) {
        careArea = lastCareArea;
      }
      const normCareArea = isEmptyVal(careArea) ? careArea : fixCareArea(String(careArea).trim());

      entries.push({
        sheet: name,
        rowNum: row.r + 1, // 1-based for humans
        careArea: normCareArea,
        drug: fixDosingName(row.drug),
        dosing: fixDosingName(row.dosing),
        key: makeKey(careArea, row.drug, row.dosing),
        fields: row.fields,
      });
    }

    if (lastCareArea) lastCareAreaCrossSheet = lastCareArea;

    // Skip sheets whose entries are all Rate Mode placeholders.
    if (entries.length === 0) continue;
    const allRateMode = entries.every((e) => startsWithRateMode(e.drug));
    if (allRateMode) continue;

    result.sheets.push({ name, entries });
  }

  return result;
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------
//
// Returns { rows, headerMap, unmappedHeaders }
//   rows: [{ careArea, drug, dosing, key, fields:{key:raw} }]
//   headerMap: { canonicalKey: matchedHeaderString }
//   unmappedHeaders: CSV headers we couldn't assign to a canonical field

function normHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Map CSV headers onto canonical field keys.
function buildHeaderMap(headers) {
  const headerMap = {};
  const usedHeaders = new Set();

  const findIdentity = (key, predicate) => {
    for (const h of headers) {
      if (usedHeaders.has(h)) continue;
      if (predicate(String(h).toLowerCase())) {
        headerMap[key] = h;
        usedHeaders.add(h);
        return;
      }
    }
  };

  // Identity fields use the spec's "contains" detection (priority order).
  findIdentity("careArea", (h) => h.includes("care area"));
  findIdentity("drug", (h) => h.includes("drug name") || h.includes("drug"));
  findIdentity("dosing", (h) => h.includes("dosing name") || h.includes("dosing"));

  // Non-identity fields: normalized exact label match, then contains fallback.
  const normedHeaders = headers.map((h) => ({ h, n: normHeader(h) }));
  for (const def of COLUMNS) {
    if (IDENTITY_KEYS.includes(def.key)) continue;
    if (headerMap[def.key]) continue;
    const target = normHeader(def.label);
    let hit = normedHeaders.find(
      ({ h, n }) => !usedHeaders.has(h) && n === target
    );
    if (!hit) {
      hit = normedHeaders.find(
        ({ h, n }) => !usedHeaders.has(h) && (n.includes(target) || target.includes(n)) && n.length > 0
      );
    }
    if (hit) {
      headerMap[def.key] = hit.h;
      usedHeaders.add(hit.h);
    }
  }

  const unmappedHeaders = headers.filter((h) => !usedHeaders.has(h));
  return { headerMap, unmappedHeaders };
}

export function parseCsv(arrayBuffer) {
  // raw:true preserves leading/trailing spaces in cell values.
  const wb = XLSX.read(arrayBuffer, { type: "array", raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });

  if (rows.length === 0) {
    return { rows: [], headerMap: {}, unmappedHeaders: [], headers: [] };
  }

  const headers = Object.keys(rows[0]);
  const { headerMap, unmappedHeaders } = buildHeaderMap(headers);

  const caKey = headerMap.careArea;
  const drugKey = headerMap.drug;
  const dosingKey = headerMap.dosing;

  const parsed = [];
  for (const raw of rows) {
    const careAreaRaw = caKey ? raw[caKey] : null;
    const careArea = isEmptyVal(careAreaRaw) ? careAreaRaw : fixCareArea(String(careAreaRaw).trim());
    const drug = fixDosingName(drugKey ? raw[drugKey] : null);
    const dosing = fixDosingName(dosingKey ? raw[dosingKey] : null);

    // Skip rows with no drug name.
    if (isEmptyVal(drug)) continue;

    const fields = {};
    for (const def of COLUMNS) {
      if (IDENTITY_KEYS.includes(def.key)) continue;
      const h = headerMap[def.key];
      fields[def.key] = h ? raw[h] : null;
    }

    parsed.push({
      careArea,
      drug,
      dosing,
      key: makeKey(careArea, drug, dosing),
      fields,
    });
  }

  return { rows: parsed, headerMap, unmappedHeaders, headers };
}
