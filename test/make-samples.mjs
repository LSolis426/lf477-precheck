// Generates sample files in ../samples for manual UI testing.
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "samples");
mkdirSync(outDir, { recursive: true });

// Build a DERS template sheet with 3 header rows then data.
function sheet(rows) {
  const aoa = [[], [], []];
  const hdr = [];
  hdr[1] = "Care Area";
  hdr[2] = "Drug Name";
  hdr[3] = "Dosing Name";
  hdr[4] = "Conc Unit";
  hdr[5] = "Conc Amount";
  hdr[8] = "Pri Dose Unit"; // col 9 (1-based) -> index 8
  hdr[9] = "Pri Dose"; //      col 10 -> index 9
  hdr[14] = "Pri Time"; //     col 15 -> index 14
  aoa[2] = hdr;
  for (const r of rows) {
    const row = [];
    row[1] = r.careArea;
    row[2] = r.drug;
    row[3] = r.dosing;
    row[4] = r.concUnit;
    row[5] = r.concAmount;
    row[8] = r.priDoseUnit;
    row[9] = r.priDose;
    if (r.priTimeSerial !== undefined) row[14] = r.priTimeSerial;
    aoa.push(row);
  }
  return XLSX.utils.aoa_to_sheet(aoa);
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  wb,
  sheet([
    { careArea: "Adult", drug: "Heparin", dosing: "Standard", concUnit: "Units", concAmount: 25000, priDoseUnit: "Units/hr", priDose: 12, priTimeSerial: 60 / 86400 },
    { careArea: "Adult", drug: "Insulin", dosing: "Drip", concUnit: "milliunits", concAmount: 100, priDoseUnit: "mUnits/kg/min", priDose: 0.5 },
    { careArea: "Adult", drug: "Bivalirudin", dosing: "Standard", concUnit: "mg", concAmount: 250, priDoseUnit: "mg/kg/hr", priDose: 0.15 },
    { careArea: "Adult", drug: "Norepinephrine", dosing: "Central", concUnit: "mcg", concAmount: 4, priDoseUnit: "mcg/min", priDose: 5 },
  ]),
  "Adult"
);
const xlsxBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(join(outDir, "sample-template.xlsx"), xlsxBuf);

// CSV: Heparin matches (unit alias + time string), Insulin matches smart,
// Bivalirudin has trailing space (strict diff), Norepinephrine dose mismatch,
// plus an extra drug not in Excel.
const csv =
  "Care Area,Drug Name,Dosing Name,Conc Unit,Conc Amount,Pri Dose Unit,Pri Dose,Pri Time\n" +
  "Adult,Heparin,Standard,unit,25000.0,units/hr,12,00:01:00\n" +
  "Adult,Insulin,Drip,milliunits,100,milliunits/kg/min,0.5,\n" +
  "Adult,Bivalirudin ,Standard,mg,250,mg/kg/hr,0.15,\n" +
  "Adult,Norepinephrine,Central,mcg,4,mcg/min,8,\n" +
  "Adult,Epinephrine,Peripheral,mcg,1,mcg/min,2,\n";
writeFileSync(join(outDir, "sample-export.csv"), csv);

console.log("Wrote samples to", outDir);
