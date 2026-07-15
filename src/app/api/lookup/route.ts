import { NextRequest, NextResponse } from "next/server";

const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  if (!word) return NextResponse.json({ error: "Missing word" }, { status: 400 });

  try {
    const res = await fetch(DICT_API + encodeURIComponent(word), {
      headers: { "User-Agent": "vocab-app/1.0" },
    });
    if (res.status === 404) return NextResponse.json({ error: "Word not found" }, { status: 404 });
    if (!res.ok) throw new Error(`Dictionary API error: ${res.status}`);

    const data = await res.json();
    const entry = data[0];
    const phonetics = entry.phonetics || [];
    const textPhon = phonetics.find((p: any) => p.text);
    const audioPhon = phonetics.find((p: any) => p.audio);
    const meaning = entry.meanings?.[0] || {};
    const def = meaning.definitions?.[0] || {};

    return NextResponse.json({
      word: entry.word,
      pronunciation: textPhon?.text || "",
      audioUrl: audioPhon?.audio || "",
      pos: meaning.partOfSpeech || "unknown",
      definition: def.definition || "",
      example: def.example || "",
      synonyms: meaning.synonyms || [],
      meanings: entry.meanings || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
