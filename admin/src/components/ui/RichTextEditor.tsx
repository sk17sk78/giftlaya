import { useState } from "react";
import { Bold, Italic, List, Heading2, Code } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write description or SEO content...",
  rows = 5,
}: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(true);

  const wrapTag = (openTag: string, closeTag: string) => {
    const snippet = `${openTag}Text${closeTag}`;
    onChange(value ? `${value}\n${snippet}` : snippet);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => wrapTag("<strong>", "</strong>")}
            className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Bold"
            aria-label="Bold"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => wrapTag("<em>", "</em>")}
            className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Italic"
            aria-label="Italic"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => wrapTag("<h2>", "</h2>")}
            className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Heading"
            aria-label="Heading"
          >
            <Heading2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => wrapTag("<ul>\n  <li>", "</li>\n</ul>")}
            className="p-1.5 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List size={13} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSourceMode((s) => !s)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
        >
          <Code size={12} /> {sourceMode ? "Preview" : "HTML"}
        </button>
      </div>

      {sourceMode ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none resize-y"
        />
      ) : (
        <div
          className="p-3 min-h-[110px] prose prose-sm max-w-none text-xs text-slate-700 dark:text-slate-200"
          dangerouslySetInnerHTML={{
            __html: value || `<p class="text-slate-400">${placeholder}</p>`,
          }}
        />
      )}
    </div>
  );
}

