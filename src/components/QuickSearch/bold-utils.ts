// components/bold-utils.ts
export function extractBoldStrings(html?: string): string[] {
  if (!html) return [];
  // Hızlı ve güvenli bir çözüm: DOMParser yerine regex ile <b>/<strong> içlerini çekiyoruz
  // Not: Server ortamında da çalışır.
const matches = Array.from(
  html.matchAll(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi)
);
  return matches
    .map((m) => stripTags(m[2]).trim())
    .filter(Boolean);
}

export function stripTags(source: string): string {
  return source.replace(/<[^>]*>/g, "");
}

export function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFKD")         // Türkçe karakterleri normalize et
    .replace(/\p{Diacritic}/gu, "");
}

export function highlight(text: string, query: string): string {
  const q = normalize(query);
  if (!q) return text;
  // Basit highlight: query ile eşleşen kısmı <mark> ile sar
  // (HTML injection’a karşı text’i olduğu gibi kullanıyoruz; sadece indeksleri sarıyoruz)
  const raw = text;
  const low = normalize(text);
  const i = low.indexOf(q);
  if (i === -1) return raw;
  const j = i + q.length;
  return raw.slice(0, i) + "<mark>" + raw.slice(i, j) + "</mark>" + raw.slice(j);
}
