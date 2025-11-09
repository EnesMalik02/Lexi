// src/lib/GeminiService.ts
export async function generateSentenceForWord(word: string): Promise<string> {
  const res = await fetch("/api/generate-sentence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        if (j?.error) msg = j.error + ` (${res.status})`;
      } else {
        const txt = await res.text();
        if (txt) msg = `${msg}: ${txt.slice(0, 200)}`;
      }
    } catch {}
    throw new Error(msg);
  }

  const data = (await res.json()) as { sentence: string };
  return data.sentence;
}
