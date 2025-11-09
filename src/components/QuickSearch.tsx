"use client";

import React from "react";
import { extractBoldStrings, normalize, stripTags, highlight } from "./bold-utils";
import type { SearchItem } from "./search-types";

type Ranked = { item: SearchItem; score: number; previewSource: string };

type Props = {
  items: SearchItem[];
  placeholder?: string;
  boldOnly?: boolean;                   
  limit?: number;
  onSelect?: (item: SearchItem) => void; // bir sonuç seçildiğinde
  onResultsChange?: (results: Ranked[]) => void; // === yeni
  onQueryChange?: (q: string) => void;           // === yeni
};

export default function QuickSearch({
  items,
  placeholder = "Hızlı ara… (Ctrl/⌘+K)",
  boldOnly = true,
  limit = 20,
  onSelect,
  onResultsChange,
  onQueryChange,
}: Props) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const lastKey = React.useRef<string>("");


  // Ctrl/⌘ + K ile fokus / ESC ile kapat
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounce
  const [debouncedQ, setDebouncedQ] = React.useState(q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 180);
    return () => clearTimeout(t);
  }, [q]);

  const results: Ranked[] = React.useMemo(() => {
    const nq = normalize(debouncedQ);
    if (!nq) return [];

    const rank = (h: string, nq: string) => {
      const n = normalize(h);
      const i = n.indexOf(nq);
      if (i === -1) return 0;
      return 1000 - i - Math.min(n.length, 300) * 0.001; // ufak sezgisel skor
    };

    return items
      .map((it) => {
        const bolds = extractBoldStrings(it.html);
        const hay: string[] = boldOnly
          ? bolds
          : [
              it.title ?? "",
              ...bolds,
              it.text ?? "",
              it.html ? stripTags(it.html) : "",
            ];

        const score = hay.reduce((best, h) => Math.max(best, rank(h, nq)), 0);
        const previewSource =
          hay.find((h) => normalize(h).includes(nq)) ?? it.title ?? "";

        return { item: it, score, previewSource };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [items, debouncedQ, boldOnly, limit]);

  // parent'ı bilgilendir

React.useEffect(() => {
  const key = results.map(r => r.item.id).join("|"); // sonuç imzası
  if (key !== lastKey.current) {
    onResultsChange?.(results);
    lastKey.current = key;
  }
}, [results]);

  const handlePick = (it: SearchItem) => {
    onSelect?.(it);
    if (it.href) window.location.href = it.href;
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onQueryChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
      />

      {open && debouncedQ && (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-lg border bg-white p-2 shadow-lg">
          {results.length === 0 ? (
            <div className="px-2 py-3 text-sm text-gray-500">Sonuç yok</div>
          ) : (
            <ul>
              {results.map(({ item, previewSource }) => (
                <li
                  key={item.id}
                  className="cursor-pointer rounded-md px-3 py-2 hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(item)}
                >
                  {item.title && (
                    <div className="text-sm font-medium">{item.title}</div>
                  )}
                  <div
                    className="text-xs text-gray-600"
                    dangerouslySetInnerHTML={{
                      __html: highlight(previewSource ?? "", debouncedQ),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
