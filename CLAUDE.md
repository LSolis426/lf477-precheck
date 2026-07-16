# 3870 LF477 Template Pre-Check — Project Handoff

## What This Is

A single-page browser tool that pre-checks iRadimed 3870 pump drug library templates (LF477 format) before they go to formal validation. Pharmacists submit Excel templates; this tool catches common errors so they can fix them before the real validation process.

**Live file:** `LF477_Checker.html`  
**Stack:** Pure static HTML — no build step, no dependencies beyond one CDN script (SheetJS for Excel parsing).

---

## Deploying to Vercel

This is a **static site** — one HTML file. Vercel hosts it with zero config.

### Quickest path

1. Create a GitHub repo and push this folder to it.
2. Import the repo into Vercel (vercel.com → Add New → Project).
3. Set **Framework Preset** to `Other` (no framework).
4. Set **Output Directory** to `.` (root) — or move `LF477_Checker.html` to a `public/` folder and set output to `public`.
5. Deploy. Vercel serves `LF477_Checker.html` at the root URL.

### Optional: rename to `index.html`

Vercel serves `index.html` automatically at `/`. Rename `LF477_Checker.html` → `index.html` so users hit the tool directly at `https://your-project.vercel.app/` with no filename in the URL.

### Optional `vercel.json` (only needed if you keep the long filename)

```json
{
  "rewrites": [
    { "source": "/", "destination": "/LF477_Checker.html" }
  ]
}
```

---

## File Structure

```
3870 Template Checker/
├── LF477_Checker.html    ← the entire app (HTML + CSS + JS, self-contained)
├── CLAUDE.md             ← this file
└── vercel.json           ← optional, only if not renaming to index.html
```

---

## How the App Works

User drops an `.xlsx` LF477 template onto the page → clicks **Run Pre-Check** → results appear grouped by rule.

**External dependency:** SheetJS 0.18.5 loaded from `cdnjs.cloudflare.com`. No other network calls. File parsing happens entirely in the browser — nothing is uploaded to a server.

### Template format assumed

The tool expects the standard iRadimed LF477 Excel layout:
- **Rows 1–3:** Headers (skipped)
- **Row 4+:** Drug entries
- **Multiple sheets** supported (one sheet per care area, or multiple care areas per sheet via column B)

### Column map (0-based indices used in JS)

| Col | Letter | Field |
|-----|--------|-------|
| 1 | B | Care Area |
| 2 | C | Drug Name |
| 3 | D | Dosing Name |
| 4–7 | E–H | Concentration fields (Conc Unit, Conc Amount, Diluent Unit, Diluent Amount) |
| 8 | I | Primary Dose Unit |
| 9 | J | Primary Initial Dose |
| 10 | K | Primary Upper Hard |
| 11 | L | Primary Lower Hard |
| 12 | M | Primary Upper Soft |
| 13 | N | Primary Lower Soft |
| 14–18 | O–S | Primary Time limits |
| 19 | T | Bolus Dose Unit |
| 20–24 | U–Y | Bolus dose limits (Initial, UH, LH, US, LS) |
| 25–29 | Z–AD | Bolus Time limits |
| 30 | AE | Loading Dose Unit |
| 31–35 | AF–AJ | Loading dose limits |
| 36–40 | AK–AO | Loading Time limits |
| 41–44 | AP–AS | Weight limits (UH, LH, US, LS) |
| 45 | AT | KVO Mode |
| 46 | AU | KVO Rate (mL/hr) |
| 47 | AV | Quick Recall (optional — checked only if column exists) |

---

## Rules Implemented

### Rule 1 — Duplicate Drug + Dosing Name
Within the same care area (same sheet + same col B value), every Drug Name + Dosing Name pair must be unique. Duplicates are shown as bordered amber groups listing all matching rows.

**Key detail:** Propofol in ICU and Propofol in ANES on the same sheet is *not* a duplicate — keyed by `(sheet, care area, drug, dosing)`.

### Rule 2 — mL-based Unit with Concentration Data
If Primary Dose Unit (col I) is mL-based (`mL`, `mL/hr`, `mL/min`, etc.), columns E–H must be blank. Flags each non-blank concentration field individually.

### Rule 3 — Limits Not in Descending Order
For each of Primary, Bolus, Loading, and Weight sections, limits must satisfy:  
`Upper Hard ≥ Upper Soft ≥ Initial Dose ≥ Lower Soft ≥ Lower Hard`  
Only compares fields that are actually filled in. Checks adjacent pairs in that positional order.

### Rule 4 — Too Many Decimal Places
Any numeric dose/limit value may have at most 3 decimal places (minimum precision 0.001). Uses `toPrecision(15)` to strip floating-point noise before checking.

### Rule 5 — Required Fields Missing
These must never be blank: Care Area (B), Drug Name (C), Dosing Name (D), Primary Dose Unit (I), KVO Mode (AT). Quick Recall (AV) is also required *if that column exists* in the template.

### Rule 6 — KVO Rate Missing or Out of Range
When KVO Mode (AT) = `"Rate"` (case-insensitive), KVO Rate (AU) must be present and between **0.4 and 20 mL/hr**.

### Rule 7 — KVO Rate Should Be Blank
When KVO Mode = `"Off"` or `"Continue Primary Rate"`, KVO Rate (AU) must be empty.

### Rule 17 — KVO Rate Out of Range (universal AU value check)
Independent of KVO Mode: KVO Rate (AU), *if not blank*, must be a **number between
0.4 and 20 mL/hr** (inclusive). Flags non-numeric values (e.g. text like `"5 mL/hr"`)
and numbers outside the range. Blank is always allowed. This complements Rules 6 & 7
(which are mode-specific) and fills the gaps they miss — e.g. a non-numeric rate under
Rate mode, or an out-of-range value when Mode is blank or unrecognized. To avoid
double-reporting, Rule 17 is suppressed on a cell already flagged by Rule 6 (Rate mode,
numeric out of range) or Rule 7 (Off/Continue with any value).

### Rule 8 — Weight Outside 0.1–350 kg
Weight limit columns (AP–AS) must be between 0.1 and 999 kg if filled.

### Rule 9 — Name Too Long for Display Field
Care Area, Drug Name, and Dosing Name each have a physical pixel-width limit on the pump screen. Each character has a known capacity (how many of that character fit):

- **Flagging threshold:** fill ratio > 1.13 (over 113% capacity)
- **Split threshold for highlighting:** 1.13 (empirically calibrated from confirmed pump behavior — names up to ratio ~1.104 still display in full)
- **Display:** The Issue cell shows the name with a monospace font; characters that fit are normal, characters that overflow are **red with underline**. Hovering shows tooltip.

Character capacities are Tallman-lettering aware (uppercase and lowercase have separate tables). Unknown characters (digits, spaces, symbols) default to capacity 20.

**Calibration data points (confirmed fitting on actual pump):**
- `"EPINEPHrine mcg/kg/mi"` fits (ratio 1.027)
- `"NORepinephrine mcg/kg"` fits (ratio 1.023)
- `"NORepinephrine mcg/mi"` fits (ratio 1.036)
- `"EPINEPHrine mcg/kg/min"` fits (ratio 1.077)
- `"NORepinephrine mcg/kg/"` fits (ratio 1.073)
- `"NORepinephrine mcg/min"` fits (ratio 1.086)
- `"NORepinephri mcg/kg/mn"` fits (ratio 1.104)

For `"NORepinephrine mcg/kg/min"` (ratio 1.232), split at 1.13 correctly shows fits=`"NORepinephrine mcg/kg/"` over=`"min"`.

### Rule 10 — Alphabetical Order May Surprise Clinicians
Within each care area + drug group, dosing names are sorted two ways:
1. **Alphabetical** (what the pump displays)
2. **Natural/numeric** (e.g. 5 before 10)

If they differ, a purple-bordered box shows both columns side by side. Entries that are in the wrong alphabetical position are highlighted red (pump column) or green (recommended column). A **yellow dashed box** is prepended to any dosing name that needs a leading space/symbol added to fix its sort order.

Also flags any dosing name starting with a non-alphanumeric character (floats before A–Z).

### Rule 13 — Drug Display Order Within Care Area
Within each care area (sheet + col B), the pump displays drug names in alphabetical order regardless of template entry order. This rule flags care areas where the pump's alphabetical order would differ from the order drugs were entered, so pharmacists can see what the pump will actually show.

Display: side-by-side "Template entry order" vs "Pump will show (alphabetical)", with drugs that changed position highlighted. Also flags drug names starting with a non-alphanumeric character (those float before A–Z on the pump screen). Severity: warn.

### Rule 12 — Conc Unit Filled Without Numeric Concentration Values
If Conc Amount (F) and Diluent Amount (H) are both blank, Conc Unit (E) must also be blank. When a pharmacist intends a wildcard concentration (any concentration allowed), all three fields should be empty. A unit in E with no numbers in F/H is an incomplete entry.

### Rule 18 — Conc Amount (col F) & Diluent Amount (col H) Must Be a Number or Blank
Columns F (Conc Amount) and H (Diluent Amount) hold only numeric amounts — each must be
a number, or left blank. Any letters/units in them (e.g. `"mcg"` in F, `"mL"` in H) are a
data-entry error: the unit belongs in the matching unit column (Conc Unit col E for F,
Diluent Unit col G for H), not the amount column. A value is accepted if it is a numeric
cell or a plain numeric string (`450`, `0.5`); it is flagged if it contains letters or
other non-numeric text (`"mcg"`, `"5 mcg"`). Blank is always allowed; F and H are checked
independently (a bad F and a bad H on the same row produce two separate flags). Verified
against `MultiCare Corporate 3870 DERS 06.30.26.xlsx`, where PEDIATRIC F5–F8 (PEDS
dexmedeTOMidine) contain `"mcg"` and are correctly flagged, while numeric F/H cells
elsewhere are not.

### Rule 19 — Conc Unit (col E) & Diluent Unit (col G) Must Be Letters or Blank
The mirror of Rule 18. Columns E (Conc Unit) and G (Diluent Unit) hold only the unit
text (e.g. `"mg"`, `"mcg"`, `"mL"`) — each must be blank or contain **no digits**. A
number in a unit column usually means a numeric amount was entered in the wrong column;
the amount belongs in the matching amount column (F for E, H for G). Flagged if the cell
contains any digit 0–9 (`450`, `"5mg"`); allowed if blank or purely non-numeric,
including slash notation like `"mcg/kg"`. E and G are checked independently. Verified
against the MultiCare file (all E/G cells are pure-letter units → no false positives).

### Rule 20 — Dosing Name vs Entered Concentration
Compares the concentration encoded in the Dosing Name (col D) against the entered
concentration (cols E–H). The dosing name is parsed as `<amt> <unit> / <dilAmt> <dilUnit>`
(e.g. `"1000 mcg / 250 mL"`; commas and missing spaces like `"100mL"` are tolerated).
Two outcomes, shown with colored chips in the Issue cell:
- **RED** (`conc-bad`, counts as an error) — the name and E–H do not match and their **final
  concentration** (amt ÷ dilAmt) is also different, OR the units differ, OR E–H is not a valid
  number. Example: name `1000 mcg / 250 mL` vs entered `1000 mcg / 100 mL`.
- **YELLOW** (`conc-warn`, counts as a warning) — the numbers differ but the **final
  concentration is the same** (e.g. name `1 mg / 1 mL` vs entered `100 mg / 100 mL`, both
  1 mg/mL). Flagged as "likely intentional — verify," not a hard error.

Rows are skipped when the dosing name isn't a concentration expression (e.g. `"mL/hr"`), or
when nothing is entered in E–H. This rule carries a per-issue `severity` (`err`/`warn`) rather
than a fixed rule severity; the summary counts and section-header color honor it (see
`i.severity || RULE_INFO[i.rule].severity` in `renderResults`). Verified against
`MultiCare Corporate 3870 DERS 06.30.26.xlsx`: correctly flags PEDIATRIC row 8 (dexmedeTOMidine,
250 mL name vs 100 mL entered) and ADULT row 13 (DOPamine, 250 mL vs 270 mL) as red, with no
false positives on matching rows.

### Rule 11 — Time Limit Column Not in hh:mm:ss Format
Columns O–S (Primary time), Z–AD (Bolus time), AK–AO (Loading time) must contain Excel time values (stored internally as decimal fractions 0–1 representing fractions of a 24-hour day).

Flags:
- **String values** — pharmacists from Alaris/Baxter/Hospira sometimes enter rates as text (e.g. `"mg/hr"`) because that's how their other pumps work. These must be converted to a time duration (how long the bolus runs).
- **Numbers > 1** — value exceeds 24 hours; likely entered as a numeric rate instead of a time.
- **Numbers ≤ 0** — not a valid positive duration.

Valid: any number `0 < v ≤ 1` (Excel time fraction). Example: 10 minutes = `0.006944`.

---

## Key JS Functions

| Function | Purpose |
|----------|---------|
| `validate(workbook)` | Main loop — iterates all sheets/rows, returns flat `allIssues[]` array |
| `renderResults(issues)` | Groups issues by rule, builds DOM |
| `fillRatio(str)` | Returns display fill ratio (0–1+) for a string using character capacity tables |
| `buildOverflowHtml(str)` | Returns HTML with overflow chars highlighted red; uses `SPLIT_THRESHOLD = 1.13` |
| `naturalCompare(a, b)` | Comparator treating embedded digit runs numerically (for Rule 10) |
| `toggleSection(header)` | Expand/collapse a rule section |
| `escHtml(str)` | HTML-escape helper |
| `processFile(file)` | Reads file via FileReader → SheetJS |
| `runValidation()` | Entry point wired to button |

---

## Known Limitations / Future Work

- **No server-side processing** — everything runs in the browser. File never leaves the user's machine.
- **SheetJS CDN dependency** — if `cdnjs.cloudflare.com` is unavailable, the tool won't parse files. For a production deployment, consider vendoring `xlsx.full.min.js` locally.
- **Rule 9 calibration** — the `SPLIT_THRESHOLD = 1.13` was calibrated against a specific pump screen (7 confirmed data points, max fit ratio 1.104). If iRadimed ships a firmware update that changes the font, this value may need adjustment.
- **Rule 10 natural sort** — sorts primarily by the first number found anywhere in the dosing name (handles both "5mg" vs "10mg" inversions AND embedded-number cases like "Single (1mg/mL)" vs "Double (2mg/mL)" vs "QUAD (4mg/mL)"). Does not handle locale-specific sorting edge cases.
- **Quick Recall (AV)** — checked as required only when the column is present in the template. Templates without AV are silently skipped for that check.
