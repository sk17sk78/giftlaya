import { useRef, useState } from "react";
import {
  Upload,
  ArrowUp,
  ArrowDown,
  Trash2,
  Star,
  Plus,
} from "lucide-react";

export interface ImageItem {
  url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

interface ImageUploaderProps {
  value: ImageItem[];
  onChange: (next: ImageItem[]) => void;
  maxImages?: number;
}

export function ImageUploader({
  value,
  onChange,
  maxImages = 10,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);

  const normalizeOrder = (items: ImageItem[]) =>
    items.map((it, idx) => ({
      ...it,
      sort_order: idx,
      is_primary: items.some((x) => x.is_primary) ? it.is_primary : idx === 0,
    }));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .slice(0, Math.max(0, maxImages - value.length))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          if (!dataUrl) return;
          onChange(
            normalizeOrder([
              ...value,
              {
                url: dataUrl,
                alt_text: file.name.replace(/\.[^.]+$/, ""),
                sort_order: value.length,
                is_primary: value.length === 0,
              },
            ])
          );
        };
        reader.readAsDataURL(file);
      });
  };

  const addByURL = () => {
    const clean = urlInput.trim();
    if (!clean || value.length >= maxImages) return;
    onChange(
      normalizeOrder([
        ...value,
        {
          url: clean,
          alt_text: "",
          sort_order: value.length,
          is_primary: value.length === 0,
        },
      ])
    );
    setUrlInput("");
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(normalizeOrder(next));
  };

  const setPrimary = (idx: number) => {
    onChange(
      value.map((it, i) => ({
        ...it,
        is_primary: i === idx,
      }))
    );
  };

  const remove = (idx: number) => {
    onChange(normalizeOrder(value.filter((_, i) => i !== idx)));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[#4f6ef7] bg-indigo-50/50 dark:bg-indigo-950/20"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Upload size={18} className="mx-auto text-slate-400 mb-1.5" />
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Drop product images here or click to browse
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Up to {maxImages} images · First / starred image shows on cards
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Or paste CDN image URL (https://...)"
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
        />
        <button
          type="button"
          onClick={addByURL}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
        >
          <Plus size={13} /> Add URL
        </button>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {value.map((img, idx) => (
            <div
              key={`${img.url.slice(0, 32)}-${idx}`}
              className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
            >
              <img
                src={img.url}
                alt={img.alt_text || "Product"}
                className="w-14 h-14 rounded-lg object-cover bg-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  type="text"
                  value={img.alt_text}
                  onChange={(e) => {
                    const next = [...value];
                    next[idx] = { ...next[idx], alt_text: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Alt text for SEO"
                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    title="Set as primary image"
                    className={`p-1 rounded text-[10px] inline-flex items-center gap-1 cursor-pointer ${
                      img.is_primary
                        ? "bg-amber-100 text-amber-800 font-semibold"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <Star size={11} />
                    {img.is_primary ? "Primary" : "Make primary"}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    aria-label="Move image up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === value.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    aria-label="Move image down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-1 text-red-400 hover:text-red-600 ml-auto cursor-pointer"
                    aria-label="Remove image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
