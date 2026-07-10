// Canonical field definitions for the DERS template.
//
// Excel parsing is POSITIONAL (per the spec): `col` is the 1-based column
// number in the template (matching the spec's "Col N" notation). The 0-based
// sheet index is therefore `col - 1`.
//
// `label` is the human-readable field name. For CSV (which is header-driven)
// these labels are used to match CSV headers by name.
//
// `isTime` marks columns stored by Excel as a decimal fraction of a day and
// exported by the CSV as an HH:MM:SS string — only these get time conversion.
// `isIdentity` marks the three fields that uniquely identify a drug entry.

export const COLUMNS = [
  { col: 2, key: "careArea", label: "Care Area", isIdentity: true },
  { col: 3, key: "drug", label: "Drug Name", isIdentity: true },
  { col: 4, key: "dosing", label: "Dosing Name", isIdentity: true },

  { col: 5, key: "concUnit", label: "Conc Unit" },
  { col: 6, key: "concAmount", label: "Conc Amount" },
  { col: 7, key: "diluentUnit", label: "Diluent Unit" },
  { col: 8, key: "diluentAmount", label: "Diluent Amount" },

  { col: 9, key: "priDoseUnit", label: "Pri Dose Unit" },
  { col: 10, key: "priDose", label: "Pri Dose" },
  { col: 11, key: "priUpperHardDose", label: "Pri Upper Hard Dose Limit" },
  { col: 12, key: "priLowerHardDose", label: "Pri Lower Hard Dose Limit" },
  { col: 13, key: "priUpperSoftDose", label: "Pri Upper Soft Dose Limit" },
  { col: 14, key: "priLowerSoftDose", label: "Pri Lower Soft Dose Limit" },
  { col: 15, key: "priTime", label: "Pri Time", isTime: true },
  { col: 16, key: "priUpperHardTime", label: "Pri Upper Hard Time Limit", isTime: true },
  { col: 17, key: "priLowerHardTime", label: "Pri Lower Hard Time Limit", isTime: true },
  { col: 18, key: "priUpperSoftTime", label: "Pri Upper Soft Time Limit", isTime: true },
  { col: 19, key: "priLowerSoftTime", label: "Pri Lower Soft Time Limit", isTime: true },

  { col: 20, key: "bolusDoseUnit", label: "Bolus Dose Unit" },
  { col: 21, key: "bolusDose", label: "Bolus Dose" },
  { col: 22, key: "bolusUpperHardDose", label: "Bolus Upper Hard Dose Limit" },
  { col: 23, key: "bolusLowerHardDose", label: "Bolus Lower Hard Dose Limit" },
  { col: 24, key: "bolusUpperSoftDose", label: "Bolus Upper Soft Dose Limit" },
  { col: 25, key: "bolusLowerSoftDose", label: "Bolus Lower Soft Dose Limit" },
  { col: 26, key: "bolusTime", label: "Bolus Time", isTime: true },
  { col: 27, key: "bolusUpperHardTime", label: "Bolus Upper Hard Time Limit", isTime: true },
  { col: 28, key: "bolusLowerHardTime", label: "Bolus Lower Hard Time Limit", isTime: true },
  { col: 29, key: "bolusUpperSoftTime", label: "Bolus Upper Soft Time Limit", isTime: true },
  { col: 30, key: "bolusLowerSoftTime", label: "Bolus Lower Soft Time Limit", isTime: true },

  { col: 31, key: "loadingDoseUnit", label: "Loading Dose Unit" },
  { col: 32, key: "loadingDose", label: "Loading Dose" },
  { col: 33, key: "loadingUpperHardDose", label: "Loading Upper Hard Dose Limit" },
  { col: 34, key: "loadingLowerHardDose", label: "Loading Lower Hard Dose Limit" },
  { col: 35, key: "loadingUpperSoftDose", label: "Loading Upper Soft Dose Limit" },
  { col: 36, key: "loadingLowerSoftDose", label: "Loading Lower Soft Dose Limit" },
  { col: 37, key: "loadingTime", label: "Loading Time", isTime: true },
  { col: 38, key: "loadingUpperHardTime", label: "Loading Upper Hard Time Limit", isTime: true },
  { col: 39, key: "loadingLowerHardTime", label: "Loading Lower Hard Time Limit", isTime: true },
  { col: 40, key: "loadingUpperSoftTime", label: "Loading Upper Soft Time Limit", isTime: true },
  { col: 41, key: "loadingLowerSoftTime", label: "Loading Lower Soft Time Limit", isTime: true },

  { col: 42, key: "upperHardWeight", label: "Upper Hard Weight Limit" },
  { col: 43, key: "lowerHardWeight", label: "Lower Hard Weight Limit" },
  { col: 44, key: "upperSoftWeight", label: "Upper Soft Weight Limit" },
  { col: 45, key: "lowerSoftWeight", label: "Lower Soft Weight Limit" },

  { col: 46, key: "kvoMode", label: "KVO Mode" },
  { col: 47, key: "kvoRate", label: "KVO Rate" },
];

export const IDENTITY_KEYS = COLUMNS.filter((c) => c.isIdentity).map((c) => c.key);

// Non-identity fields, in template order — these are the ones we diff.
export const COMPARE_COLUMNS = COLUMNS.filter((c) => !c.isIdentity);

export const TIME_KEYS = new Set(COLUMNS.filter((c) => c.isTime).map((c) => c.key));

export const KEY_SEP = "|||";
