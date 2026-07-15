import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/words — list user's words
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const words = await prisma.word.findMany({
    where: { userId: session.user.id },
    orderBy: { dateAdded: "desc" },
  });

  return NextResponse.json(words);
}

// POST /api/words — add a word
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { word, definition, definitionEn, pos, example, pronunciation, audioUrl } = body;

  if (!word) return NextResponse.json({ error: "Missing word" }, { status: 400 });

  // Check duplicate
  const existing = await prisma.word.findUnique({
    where: { userId_word: { userId: session.user.id, word: word.toLowerCase() } },
  });
  if (existing) {
    return NextResponse.json({ error: "Word already in collection" }, { status: 409 });
  }

  const created = await prisma.word.create({
    data: {
      word: word.toLowerCase(),
      definition: definition || definitionEn || "",
      definitionEn: definitionEn || definition || "",
      pos: pos || "unknown",
      example: example || "",
      pronunciation: pronunciation || "",
      audioUrl: audioUrl || "",
      source: "manual",
      userId: session.user.id,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

// DELETE /api/words?word=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const word = req.nextUrl.searchParams.get("word");
  if (!word) return NextResponse.json({ error: "Missing word" }, { status: 400 });

  await prisma.word.deleteMany({
    where: { userId: session.user.id, word: word.toLowerCase() },
  });

  return NextResponse.json({ success: true });
}
