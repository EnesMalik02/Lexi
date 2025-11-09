import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// önce tercih ettiğimiz isimler; yoksa listeden benzerini bulacağız
const PREFERRED = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
  "gemini-2.0-flash",          // bazı projelerde bu açık olabiliyor
  "gemini-2.0-flash-exp",
];

async function listModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  const r = await fetch(url);
  const txt = await r.text();
  if (!r.ok) throw new Error(`ListModels HTTP ${r.status}: ${txt}`);
  const data = JSON.parse(txt);
  return (data.models ?? []) as Array<{
    name: string;                  // "models/gemini-1.5-flash-002"
    supportedGenerationMethods?: string[]; // ["generateContent", ...]
  }>;
}

async function callGenerate(apiKey: string, model: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Generate HTTP ${r.status}: ${txt}`);
  const data = JSON.parse(txt);
  const raw =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.output ?? "";
  return String(raw ?? "").trim();
}

export async function GET() {
  const ok = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return NextResponse.json({ ok });
}

export async function POST(req: NextRequest) {
  try {
    const { word } = (await req.json()) as { word?: string };
    if (!word?.trim()) return NextResponse.json({ error: "word is required" }, { status: 400 });

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "missing API key" }, { status: 500 });

    // 1) Mevcut modelleri getir
    const models = await listModels(apiKey);

    // 2) generateContent destekleyenleri süz
    const gens = models
      .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
      .map(m => m.name.replace(/^models\//, "")); // "models/..." -> "..."

    if (!gens.length) {
      return NextResponse.json(
        { error: "no models with generateContent",
          detail: { modelsReturned: models.map(m => m.name) } },
        { status: 500 }
      );
    }

    // 3) Tercih sırasına göre uygun olanı seç; yoksa ilk uygun modeli kullan
    const picked =
      PREFERRED.find(p => gens.includes(p)) ?? gens[0];

    const prompt =
      `Write exactly ONE B1-level English sentence (8–16 words) using "${word}". Return only the sentence.`;

    // 4) Üret
    const raw = await callGenerate(apiKey, picked, prompt);
    const sentence = raw.replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ");

    if (!sentence) {
      return NextResponse.json({ error: "empty response", model: picked, raw }, { status: 502 });
    }
    return NextResponse.json({ sentence, model: picked });
  } catch (e: any) {
    return NextResponse.json(
      { error: "generation failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
