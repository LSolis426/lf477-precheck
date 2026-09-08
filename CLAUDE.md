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

> **In-app "Rules reference" panel.** The header has a *Rules reference* button that opens a modal
> explaining every rule in plain language for the team. It's built at load by `buildRulesPanel()` from
> `RULE_INFO` (titles + severity) plus the `RULE_DESC` map (one description per rule number) — so when
> you add or change a rule, update `RULE_DESC` to keep the panel in sync. The panel also includes a
> column key and an Error/Warning legend. (A standalone shareable version of this reference also exists
> as a Claude artifact.)

### Rule 1 — Duplicate Drug + Dosing Name
Within the same care area (same sheet + same col B value), every Drug Name + Dosing Name pair must be unique. Duplicates are shown as bordered amber groups listing all matching rows.

**Key detail:** Propofol in ICU and Propofol in ANES on the same sheet is *not* a duplicate — keyed by `(sheet, care area, drug, dosing)`.

**Key detail:** rows where **both** Drug Name and Dosing Name are blank are skipped entirely (not collected into `dupGroups`). Templates often have many empty rows under a filled-down Care Area; those share an empty drug/dosing key and would otherwise be reported as a big bogus "Duplicate: / —" set. A row is only a duplicate candidate if it has a drug name and/or a dosing name.

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

**Key detail:** the whole check is skipped for rows where **both** Drug Name and Dosing Name are blank — an empty template row isn't a drug entry, so nothing is "missing" (this mirrors Rule 1). A row with a Drug Name *or* a Dosing Name is still a real entry and its other required fields are checked (e.g. a drug with a blank dosing still flags "Dosing Name empty"). Without this, a template's many trailing blank rows produced ~5 bogus "empty" issues each (184 on the Tift Regional file → 0 after the fix).

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

- **Flagging threshold:** fill ratio > **1.063** (shared constant `NAME_FIT_THRESHOLD`, used for both the flag and the red-overflow split). Set to the conservative edge — see the calibration note below. The Rule 9 section header carries a reminder to **verify flagged names in the emulator** before acting.
- **Split threshold for highlighting:** same `NAME_FIT_THRESHOLD` (1.063)
- **Display:** The Issue cell shows the name with a monospace font; characters that fit are normal, characters that overflow are **red with underline**. Hovering shows tooltip.

Character capacities are Tallman-lettering aware (uppercase and lowercase have separate tables). Non-letter characters (digits, spaces, symbols) use `OTHER_CAP` = **28** (they're narrower than most letters, so more fit per line).

**Model calibration — the digit-vs-letter problem (2026).** Two confirmed pump behaviors could NOT both be satisfied by any single threshold with the old model (`OTHER_CAP` = 20):
- Digit/punctuation-heavy `" Wt Based: 0.075 mg/mLa"` **fit** entirely (emulator-confirmed) — implied capacity ≥ ~1.18 in the old model.
- Letter-heavy `"Midazolam-status epilepticus"` **truncated to `…epileptic`** on the pump (the `us` was cut), and `"Ketamine-status epilepticus"` **truncated to `…epilepticu`** (the `s` cut) — implied capacity ~1.13–1.16 in the old model.

The fix: the old model treated digits/punctuation/spaces as the same width as a medium letter (capacity 20). They're actually narrower, so `OTHER_CAP` was raised to **28**. That lowers the ratio of digit-heavy names (they fit more easily) while barely moving letter-heavy names, opening a single valid window. `NAME_FIT_THRESHOLD` = **1.115** sits inside it and, verified through the real `validate()`/`buildOverflowHtml`, reproduces every confirmed point:
- FITS (not flagged): `" Wt Based: 0.075 mg/mL"` (0.98), `" Wt Based: 0.075 mg/mLa"` (1.02), `"NORepinephri mcg/kg/mn"` (1.06).
- OVERFLOW (flagged): `"NORepinephrine mcg/kg/min"` (1.19).
- Exact truncation reproduced: `"Midazolam-status epileptic|us"` and `"Ketamine-status epilepticu|s"` — the red split falls precisely where the pump cut.

(All ratios above are in the **new** `OTHER_CAP`=28 model, so they differ from the pre-2026 figures.) Validated across the Ascension file (315 names, no new false positives) and Bryn Mawr (correctly adds the previously-missed Ketamine). If more real fit/overflow points emerge, prefer adjusting `OTHER_CAP` and/or the specific letter capacities before moving the threshold — a single number can't fix a per-character-width error.

**The model has an accuracy ceiling (2026).** A later template (MLK) added `"…(concentrated)"` names whose confirmed pump truncations proved the heuristic **cannot be made pixel-perfect**: the ground-truth boundaries are mutually inconsistent under this character model (e.g. `"NORepinephrine ICU (conc"` *fits* at model-1.089 while `"LORazepam (concentrated)"` *truncates its ")"* at model-1.066 — the model ranks a fitting string above a truncating one). Adjusting parenthesis width or any single letter can't separate them. So the threshold was lowered to the **conservative** value **1.063** — just below the shortest confirmed truncation (`LORazepam` 1.066) and just above the tallest whole-name fit (`NORepinephri mcg/kg/mn` 1.061). Consequences, all acceptable for a warning-severity check: it catches every confirmed truncation (fixed the previously-missed `LORazepam`), the red region may **over-mark by ~1 char** (safe direction — e.g. `NORepinephrine ICU (con|centrated)` vs the pump's `(conc|entrated)`), and measured flag counts barely change on real files (MLK +1 = the LORazepam catch; HonorHealth/Ascension +0; Bryn Mawr +1 = a genuinely long name). The Rule 9 header now tells users to confirm flagged names in the emulator — the emulator is the source of truth, this check just surfaces candidates.

### Rule 10 — Alphabetical Order May Surprise Clinicians
Within each care area + drug group, dosing names are sorted two ways:
1. **Alphabetical** (what the pump displays)
2. **Natural/numeric** (e.g. 5 before 10)

If they differ, a purple-bordered box shows both columns side by side. Entries that are in the wrong alphabetical position are highlighted red (pump column) or green (recommended column). A **yellow dashed box** is prepended to any dosing name that needs a leading space/symbol added to fix its sort order.

Also flags any dosing name starting with a non-alphanumeric character (floats before A–Z).

**Fix recommendation — number-width padding (`fixPlan`).** For number-based dosing names, the
recommended fix is to **pad the shorter numbers with spaces so every number is the same digit-width**
— because the pump sorts characters left-to-right and space (code 32) sorts before digits, equal-width
numbers then sort in numeric order. Example: `1 mg/mL`, `2 mg/mL`, `10 mg/mL` → the pump shows 1,
**10, 2**; padding the single digits (` 1`, ` 2`, `10`) makes it show 1, 2, 10.

The number need NOT be at the start of the string. Each name is parsed as `<non-digit prefix><number>`
(e.g. prefix `""` for `16 mcg/mL`, or `" Wt Based: "` for ` Wt Based: 16 mcg/mL`), and numbers are
padded to equal width **within each identical-prefix group**, inserting the space(s) **right before the
number** — so a group like ` Wt Based: 16/32/128` and `Non-Wt: 16/32/128` gets a space before the
16s and 32s (→ ` 16`, ` 32`, `128`) within each prefix, and each prefix group stays together.

Critically, a single space at the FRONT of the flagged items backfires when there's a text prefix (it
reshuffles across groups) or when digit-widths differ (space before `2` alone → 2, 1, 10). The engine
computes `fixPlan` = per-item `{spaces, at}` (how many spaces, and the character offset to insert them,
i.e. before the number), plus `fixKind`, but only after **verifying** via `pumpCompare` that applying it
actually reproduces the template order.

Two strategies are tried in order (whichever first reproduces the template order wins):
- **`fixKind: 'number'`** — number-width padding (above). For numeric dosing names; spaces go *before the
  number* (`at` = offset of the number).
- **`fixKind: 'leading'`** — general **graduated leading spaces**, for any template order including
  **non-numeric** groups (e.g. `Std` / `Dbl` / `5x`, where `5x` sorts first because digits precede
  letters). Computed right-to-left, adding just enough leading spaces to each item to force it ahead of
  the next. Example: to get template order `Std, Dbl, 5x`, it recommends **2 spaces before `Std`, 1
  before `Dbl`, 0 before `5x`** — note a *single* space on each would give `Dbl, Std, 5x` (both before
  `5x` but alphabetical between themselves), so the earlier item needs one extra space to stay first.

If neither strategy reproduces the template order, it falls back to the older one-space `needsFix` hint.
In the UI the yellow dashed space box(es) render at the insertion point (`at`), and the Fix text lists
each item + its space count (worded "before the number in" vs "at the start of" per `fixKind`); for pure
number-leading groups it also shows the resulting numeric order.

### Rule 13 — Drug Display Order Within Care Area
Within each care area (sheet + col B), the pump displays drug names in alphabetical order regardless of template entry order. This rule flags care areas where the pump's alphabetical order would differ from the order drugs were entered, so pharmacists can see what the pump will actually show.

Display: side-by-side "Template entry order" vs "Pump will show (alphabetical)", with drugs that changed position highlighted. Also flags drug names starting with a non-alphanumeric character (those float before A–Z on the pump screen). Severity: warn.

### Rule 25 — Same Drug Name, Different Capitalization
Within a care area, flags Drug Names (col C) that are the same to a clinician but were entered with
different **capitalization or spacing**, e.g. `vasopressin -   Shock` vs `vasopressin -   SHOCK`. The
pump is case/space-sensitive, so it lists these as **two separate drug entries** — the clinician has
to open one, discover it's the wrong sub-list of dosing names, back out, and open the other. Wasteful
and confusing. Detection: drug names are grouped per `(sheet, care area)` by a normalized key
(`trim` + collapse internal whitespace + `toLowerCase`); any key with 2+ distinct raw spellings is
flagged. It renders as a bordered group (like Rule 1) with a small table listing **every spelling
as entered and its Excel rows** — so both `vasopressin -   Shock` (its rows) and `vasopressin -   SHOCK`
(its rows) appear under Drug Name side by side. Each name is passed through `revealWs()`, which renders
in monospace and shows **every space as a visible amber dot** (`·`) plus a "(leading/trailing space)"
note — so an otherwise-invisible trailing space (e.g. `NORepinephrine ` vs `NORepinephrine`) is obvious.
Scoped per care area (same name in different care areas is fine — separate lists). Note Rule 13's own drug list intentionally de-dupes case-insensitively, so
it would *hide* this collision — Rule 25 is the dedicated check. Severity: warn. Verified against the
Connecticut Children's 07.24.26 file: flags exactly the vasopressin `Shock`/`SHOCK` group (No-Z,
rows 34–36 vs 37–38) and nothing else.

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

### Rule 21 — Dose Unit & KVO Mode Columns Must Be Letters or Blank
Columns I (Primary Dose Unit), T (Bolus Dose Unit), AE (Loading Dose Unit), and AT (KVO
Mode) hold unit/mode text (e.g. `"mcg/kg/min"`, `"mL/hr"`, `"Continue Primary Rate"`) — each
must be blank or contain **no digits**. A number here usually means a numeric value was
entered in the wrong column. Slash notation and spaces are fine; only digits `0–9` are
flagged. (Note: assumes no body-surface-area units like `mcg/m2` — confirmed not used by
this site. If that changes, exclude the `m2`/`m²` pattern.) Blank is allowed; required-ness
of I and AT is handled separately by Rule 5.

### Rule 22 — Dose / Limit / Weight Columns Must Be Numbers or Blank
Columns J–N (Primary dose + limits), U–Y (Bolus), AF–AJ (Loading), and AP–AS (Weight limits)
must each be a number or left blank — no letters. Accepts numeric cells and plain numeric
strings; flags any value containing letters. **Deliberately excludes** the time columns
(O–S, Z–AD, AK–AO) and KVO Rate (AU), which are already validated as numeric by Rule 11 and
Rule 17 respectively — this avoids double-reporting. Together, Rules 21 + 22 give every
unit/mode column a letters-only guard and every dose/limit/weight column a numbers-only
guard. Verified against the MultiCare file (0 false positives) and synthetic cases confirming
letters in a time column report only under Rule 11, and in AU only under Rule 17.

### Rule 23 — Possible Misspelling of "min" in a Dose Unit
Rate-based dose units end in a time token — `min` or `hr` (e.g. `mcg/kg/min`, `mL/hr`). This rule
takes the last `/`-separated segment of each dose-unit column (I = Primary, T = Bolus, AE = Loading)
and flags it when it looks like a typo of **min**: either one edit away (`levenshtein(tok,'min')===1`,
e.g. `kin`, `mim`, `mn`) or a transposition/anagram of the letters m-i-n (e.g. `mni`). Valid time
tokens (`min`, `mins`, `minute(s)`, `hr`, `hour(s)`, `m`, `h`) and legitimate non-time units (`mg`,
`mL`, `mcg`, `kg`, `units`, …) are left alone — those are ≥2 edits from `min`, so no false positives.
Edit distance is capped at 1 deliberately: distance-2 would false-flag real units like `mg`. Verified
against the Connecticut Children's file, where it correctly flags exactly one entry — lidocaine
Primary Dose Unit `mcg/kg/kin` (should be `mcg/kg/min`) — and nothing else. Only "min" is checked
(as requested); the same pattern could be extended to catch `hr` typos if needed.

### Rule 24 — Possible Misspelling of "unit"/"units"
`unit`/`units` are real drug units (heparin, insulin, vasopressin, …). This rule catches near-miss
typos like `uniit` (should be `unit`). It checks three places: the **Conc Unit** cell (col E), the
**numerator unit** written in the **Dosing Name** (col D — the letters right after the first amount,
e.g. the `uniit` in `1 uniit/mL`), and each `/`-segment of the **dose-unit** columns (I / T / AE). A
token is flagged when it's one edit from `unit` or `units`, or a transposition of their letters
(`uint`, `nuit`, …). The Issue cell **highlights the wrong character(s)** in yellow (via
`wrongPositions` + `buildSpellingHtml`, shared with Rule 14) and shows a "Did you mean *unit*?"
suggestion — e.g. `uniit` renders as un[i]it with the extra `i` marked. The `looksLikeUnitWord` helper first excludes a dictionary of `VALID_UNIT_WORDS`
(`mg`, `mcg`, `mL`, `kg`, `ng`, `unit`, `units`, **`milliunits`** and its abbreviation **`mUnits`/`mUnit`/`mU`**,
`min`, `hr`, …) so real units are never flagged. This matters: `mUnits` (milliunits) is only one edit from
`units` (delete the `m`), so without the dictionary entry it would be a false positive — as seen on
Ascension's Vasopressin `mUnits/kg/min`. Both the spelled-out `milliunits` and the abbreviated `mUnits`
appear legitimately in col I across templates. Note Rule 20 does
NOT catch a `Dosing Name` like `1 uniit/mL` because it has no diluent *amount* (it's "per mL", not
"/ X mL"), so its strict 4-part concentration regex doesn't match — Rule 24 covers that gap. Verified
against the Connecticut Children's 07.24.26 file: flags exactly one entry (insulin regular, Dosing
Name `1 uniit/mL`) with no false positives despite many `milliunits/kg/min` and `units/kg/hr` cells.

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
