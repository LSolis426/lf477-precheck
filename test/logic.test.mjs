// Ad-hoc logic checks (run: node test/logic.test.mjs). Not a CI suite —
// just exercises the spec's documented edge cases.
import * as XLSX from "xlsx";
import { normalizeValue, valuesEqual } from "../src/lib/normalize.js";
import { stringSimilarity, findSuggestion } from "../src/lib/fuzzy.js";
import { parseExcel, parseCsv } from "../src/lib/parse.js";
import { compareAll } from "../src/lib/compare.js";

let pass = 0,
  fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FAIL:", name);
  }
}

// --- normalize: blank equivalence ---
const blanks = [null, undefined, "", "0", 0, 0.0, "0.0", "00:00:00"];
const normBlanks = blanks.map((b) => normalizeValue("concAmount", b, true));
check("blanks all equal", new Set(normBlanks).size === 1);
check("00:00:00 blank in time col", valuesEqual("priTime", "00:00:00", null, true));

// --- numeric folding 450 == 450.0 ---
check("int 450 == float 450.0", valuesEqual("priDose", 450, "450.0", true));
check("int 450 == float 450.0 strict", valuesEqual("priDose", 450, "450.0", false));
check("0.45 not folded to blank", !valuesEqual("priUpperHardDose", 0.45, 0, true));
check("0.45 stays 0.45", valuesEqual("priUpperHardDose", 0.45, "0.45", true));

// --- time conversion: serial vs HH:MM:SS ---
// 1 minute = 60/86400 = 0.0006944...
check("serial 1min == 00:01:00", valuesEqual("priTime", 60 / 86400, "00:01:00", true));
check("non-time small decimal NOT time-folded", normalizeValue("priUpperHardDose", 0.0006944, true).startsWith("n:"));

// --- unit aliases (smart only) ---
check("units == unit smart", valuesEqual("concUnit", "Units", "unit", true));
check("units != unit strict", !valuesEqual("concUnit", "Units", "unit", false));
check("MCG == mcg smart", valuesEqual("concUnit", "MCG", "mcg", true));
check("mUnits == milliunits smart", valuesEqual("priDoseUnit", "mUnits/kg/min", "milliunits/kg/min", true));
check("compound mcg/kg/min smart", valuesEqual("priDoseUnit", "MCG/KG/hr", "mcg/kg/HR", true));
check("Continue Primary Rate alias", valuesEqual("kvoMode", "continue rate", "Continue Primary Rate", true));

// --- trailing space (strict catches, identity untrimmed) ---
// Spec line 210: "4 " != "4" in strict mode (trailing space is a real diff).
check("numeric trailing space differs strict", !valuesEqual("concUnit", "4 ", "4", false));
check("numeric trailing space equal smart", valuesEqual("concUnit", "4 ", "4", true));
check("trailing space string differs strict", !valuesEqual("concUnit", "abc ", "abc", false));
check("trailing space string equal smart", valuesEqual("concUnit", "abc ", "abc", true));

// --- fuzzy ---
check("identical similarity 1", stringSimilarity("Heparin", "Heparin") === 1);
check("similarity case-insensitive", stringSimilarity("HEPARIN", "heparin") === 1);
const sug = findSuggestion(
  { careArea: "Adult", drug: "Bivalirudin", dosing: "Standard" },
  [
    { careArea: "Adult", drug: "Bivalirudin ", dosing: "Standard" },
    { careArea: "Peds", drug: "Bivalirudin", dosing: "Standard" },
  ]
);
check("fuzzy finds same-care-area near match", sug && sug.candidate.drug === "Bivalirudin ");

// --- end-to-end: build a tiny DERS workbook + CSV ---
function buildSheet() {
  // rows: 3 header rows then data. positional cols (1-based): B=careArea(2), C=drug(3), D=dosing(4), E=concUnit(5)
  const aoa = [];
  aoa[0] = []; // row1
  aoa[1] = []; // row2
  const hdr = [];
  hdr[1] = "Care Area";
  hdr[2] = "Drug Name";
  hdr[3] = "Dosing Name";
  hdr[4] = "Conc Unit";
  aoa[2] = hdr; // row3 header (B3 = "Care Area")
  // data rows
  const r1 = [];
  r1[1] = "Adult";
  r1[2] = "Heparin";
  r1[3] = "Standard";
  r1[4] = "Units";
  aoa[3] = r1;
  const r2 = []; // care area blank -> fill down
  r2[2] = "Insulin";
  r2[3] = "Drip";
  r2[4] = "milliunits";
  aoa[4] = r2;
  return XLSX.utils.aoa_to_sheet(aoa);
}
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, buildSheet(), "Adult");
const xlsxBuf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
const excelParsed = parseExcel(xlsxBuf);
check("excel detected as DERS", excelParsed.isDers);
check("excel 1 sheet, 2 entries", excelParsed.sheets.length === 1 && excelParsed.sheets[0].entries.length === 2);
check("care area fill-down", excelParsed.sheets[0].entries[1].careArea === "Adult");

// CSV: Heparin matches (unit alias), Insulin mismatch in strict
const csvText =
  "Care Area,Drug Name,Dosing Name,Conc Unit\n" +
  "Adult,Heparin,Standard,unit\n" +
  "Adult,Insulin,Drip,mUnits\n";
const csvBuf = new TextEncoder().encode(csvText).buffer;
const csvParsed = parseCsv(csvBuf);
check("csv 2 rows", csvParsed.rows.length === 2);
check("csv conc unit mapped", csvParsed.headerMap.concUnit === "Conc Unit");

const smart = compareAll(excelParsed, csvParsed, true);
check("smart: all matched", smart.summary.matched === 2 && smart.summary.mismatches === 0);

const strict = compareAll(excelParsed, csvParsed, false);
check("strict: both mismatch (unit alias)", strict.summary.mismatches === 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
