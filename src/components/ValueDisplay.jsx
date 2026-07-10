// Renders a raw cell value, making invisible characters explicit:
//   space → yellow ␣ badge, tab → purple TAB badge.

import { isBlankForDisplay } from "../lib/normalize.js";

export default function ValueDisplay({ value }) {
  if (isBlankForDisplay(value)) {
    return <span className="text-slate-400 italic">(blank)</span>;
  }

  const str = String(value);
  const parts = [];
  let buffer = "";
  const flush = (i) => {
    if (buffer) {
      parts.push(
        <span key={`t${i}`} className="font-mono">
          {buffer}
        </span>
      );
      buffer = "";
    }
  };

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === " ") {
      flush(i);
      parts.push(
        <span
          key={`s${i}`}
          title="space"
          className="inline-block px-1 mx-px rounded bg-yellow-200 text-yellow-900 text-[10px] leading-none align-middle"
        >
          ␣
        </span>
      );
    } else if (ch === "\t") {
      flush(i);
      parts.push(
        <span
          key={`tab${i}`}
          title="tab"
          className="inline-block px-1 mx-px rounded bg-purple-200 text-purple-900 text-[10px] leading-none align-middle"
        >
          TAB
        </span>
      );
    } else {
      buffer += ch;
    }
  }
  flush(str.length);

  return <span className="break-all">{parts}</span>;
}
