// Field-mismatch table: Field | Excel value | CSV value.

import ValueDisplay from "./ValueDisplay.jsx";

export default function DiffTable({ diffs }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-1 pr-4 font-medium">Field</th>
            <th className="py-1 pr-4 font-medium text-red-600">Excel value</th>
            <th className="py-1 font-medium text-blue-600">CSV value</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((d) => (
            <tr key={d.key} className="border-b border-slate-100 align-top">
              <td className="py-1.5 pr-4 font-medium text-slate-700 whitespace-nowrap">
                {d.label}
              </td>
              <td className="py-1.5 pr-4">
                <ValueDisplay value={d.excelValue} />
              </td>
              <td className="py-1.5">
                <ValueDisplay value={d.csvValue} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
