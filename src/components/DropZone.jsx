// File drop / picker for a single file. Native drag-and-drop + <input>.

import { useRef, useState } from "react";

export default function DropZone({ label, accept, file, onFile, tone }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const accentBorder = tone === "excel" ? "border-emerald-300" : "border-sky-300";
  const accentBg = tone === "excel" ? "bg-emerald-50" : "bg-sky-50";
  const accentText = tone === "excel" ? "text-emerald-700" : "text-sky-700";

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition
        ${dragOver ? `${accentBorder} ${accentBg}` : "border-slate-300 bg-white hover:border-slate-400"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <div className={`text-sm font-semibold ${accentText} uppercase tracking-wide`}>{label}</div>
      {file ? (
        <div className="mt-2 text-slate-700 font-medium break-all">{file.name}</div>
      ) : (
        <div className="mt-2 text-slate-400 text-sm">
          Drag &amp; drop or click to choose
        </div>
      )}
    </div>
  );
}
