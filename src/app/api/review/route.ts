import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface WordRow {
  id: string;
  word: string;
  definition: string;
  definitionEn: string;
  pos: string;
  example: string;
  pronunciation: string;
  audioUrl: string | null;
  timesReviewed: number;
  lastReviewedAt: Date | null;
  dateAdded: Date;
  userId: string;
}

type WeightedWord = WordRow & { _weight: number };

// GET /api/review?count=3 — get daily review words
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = parseInt(req.nextUrl.searchParams.get("count") || "3");

  const allWords = await prisma.word.findMany({
    where: { userId: session.user.id },
  });

  if (allWords.length === 0) {
    return NextResponse.json({ words: [], message: "Your collection is empty" });
  }

  const now = new Date();
  const weighted: WeightedWord[] = allWords
    .map((w: WordRow) => {
      let weight = 1;
      if (w.timesReviewed === 0) weight = 3;
      else if (w.lastReviewedAt) {
        const days = (now.getTime() - w.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days > 7) weight = 2;
        else if (days > 3) weight = 1;
        else weight = 0;
      }
      return { ...w, _weight: weight };
    })
    .filter((w: WeightedWord) => w._weight > 0);

  const pool: WeightedWord[] =
    weighted.length > 0
      ? weighted
      : allWords.map((w: WordRow) => ({ ...w, _weight: 1 }));

  const picked: WeightedWord[] = [];
  const remaining = [...pool];
  while (picked.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce((s: number, w: WeightedWord) => s + w._weight, 0);
    let r = Math.random() * totalWeight;
    let chosen: WeightedWord | null = null;
    for (const w of remaining) {
      r -= w._weight;
      if (r <= 0) {
        chosen = w;
        break;
      }
    }
    if (!chosen) chosen = remaining[remaining.length - 1];
    picked.push(chosen);
    const idx = remaining.findIndex((w: WeightedWord) => w.id === chosen!.id);
    remaining.splice(idx, 1);
  }

  for (const w of picked) {
    await prisma.word.update({
      where: { id: w.id },
      data: { timesReviewed: { increment: 1 }, lastReviewedAt: now },
    });
  }

  return NextResponse.json({ words: picked });
}
