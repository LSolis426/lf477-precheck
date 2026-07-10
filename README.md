# DERS Drug Template Comparator

A fully client-side web app that compares a DERS (Drug Error Reduction Software)
pump-library **Excel template** against a **CSV export** from the pump system,
field by field, and reports mismatches, missing entries, and fuzzy near-match
suggestions.

Everything runs in the browser — no backend, no database, no uploads. Vercel
(or any static host) only serves the built files.

## Run locally

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Deploy to Vercel

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- No environment variables.

## How it works

- **Excel parsing is positional.** A file is recognized as a DERS template when
  cell `B3` contains "care area". Columns are read by their fixed position
  (see `src/lib/columns.js`), not by header text. Time columns (Pri/Bolus/Loading
  time + limits) stored as Excel serials are converted to `HH:MM:SS`.
- **Multi-sheet handling.** Care Area fills down within a sheet; an overflow
  sheet with no Care Area at all inherits the last Care Area from the previous
  sheet. Sheets whose entries are all "Rate Mode" placeholders are skipped.
- **CSV parsing** uses `raw: true` to preserve leading/trailing spaces. Identity
  columns (Care Area / Drug Name / Dosing Name) are detected by header name.
- **Drug identity** = Care Area (trimmed) + Drug Name + Dosing Name (NOT trimmed
  — trailing/leading spaces are meaningful). CSV rows are compared per sheet,
  filtered to that sheet's care areas.
- **Two compare modes** (see `src/lib/normalize.js`):
  - *Ignore unit aliases* (smart): folds unit spellings (`Units`→`unit`,
    `mcg`/`MCG`, `mUnits`→`milliunit`, …), trims whitespace, plus the always-on
    rules below.
  - *Everything exactly* (strict): always-on rules only — no alias folding, no
    trimming, no case folding.
  - Always-on (both modes): blank equivalence (`null`/`""`/`0`/`0.0`/`00:00:00`),
    numeric folding (`450` == `450.0`), and time-format folding (serial ↔
    `HH:MM:SS`).
- **Fuzzy suggestions** for missing entries: same Care Area required, score =
  `0.7·sim(drug) + 0.3·sim(dosing)` (LCS-based, case-insensitive), shown when
  > 0.55, with character-level diff highlighting.

## Project layout

```
src/
  lib/
    columns.js     positional column map + field metadata
    normalize.js   value normalization + unit aliases (the two modes)
    parse.js       Excel + CSV parsing
    fuzzy.js       LCS similarity, suggestions, char diff
    compare.js     the comparison engine
  components/      DropZone, ResultsSummary, SheetAccordion, IssueCard,
                   DiffTable, SuggestionBox, ValueDisplay, CharDiff
  App.jsx          UI wiring
test/
  logic.test.mjs    edge-case checks (run: node test/logic.test.mjs)
  make-samples.mjs  generates samples/ for manual testing
```

## Note on CSV → field mapping

The spec defines Excel columns positionally and CSV columns by header name, but
only specifies header detection for the three identity fields. For the ~43
non-identity fields, this app matches CSV headers to template field labels by
normalized name (exact, then a contains-fallback). If a real pump export uses
different header text, any unmatched columns are surfaced in a collapsible
"columns not mapped" notice under the upload area — share a sample export and the
mapping in `src/lib/columns.js` / `parse.js` can be tuned exactly.
