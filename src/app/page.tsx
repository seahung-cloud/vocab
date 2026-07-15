"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";

interface WordEntry {
  id: string;
  word: string;
  definition: string;
  definitionEn: string;
  pos: string;
  example: string;
  pronunciation: string;
  audioUrl: string | null;
  timesReviewed: number;
  lastReviewedAt: string | null;
  dateAdded: string;
}

interface DictResult {
  word: string;
  pronunciation: string;
  audioUrl: string;
  pos: string;
  definition: string;
  example: string;
  synonyms: string[];
  meanings: any[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dictResult, setDictResult] = useState<DictResult | null>(null);
  const [dictError, setDictError] = useState("");
  const [words, setWords] = useState<WordEntry[]>([]);
  const [reviewWords, setReviewWords] = useState<WordEntry[]>([]);
  const [addedMsg, setAddedMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"lookup" | "collection" | "review">("lookup");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load user's words
  const loadWords = useCallback(async () => {
    try {
      const res = await fetch("/api/words");
      if (res.ok) setWords(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (session) loadWords();
  }, [session, loadWords]);

  // Lookup word
  const handleLookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setDictError("");
    setDictResult(null);
    setAddedMsg("");
    try {
      const res = await fetch(`/api/lookup?word=${encodeURIComponent(query.trim())}`);
      if (res.status === 404) { setDictError("Word not found in dictionary"); return; }
      if (!res.ok) throw new Error("Lookup failed");
      setDictResult(await res.json());
    } catch (e: any) {
      setDictError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Add word to collection
  const handleAdd = async () => {
    if (!dictResult) return;
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: dictResult.word,
          definition: dictResult.definition,
          definitionEn: dictResult.definition,
          pos: dictResult.pos,
          example: dictResult.example,
          pronunciation: dictResult.pronunciation,
          audioUrl: dictResult.audioUrl,
        }),
      });
      if (res.status === 409) { setAddedMsg("Already in your collection"); return; }
      if (!res.ok) throw new Error("Failed to add");
      setAddedMsg("Added to your collection!");
      loadWords();
    } catch {
      setAddedMsg("Failed to add word");
    }
  };

  // Delete word
  const handleDelete = async (word: string) => {
    await fetch(`/api/words?word=${encodeURIComponent(word)}`, { method: "DELETE" });
    setWords((prev) => prev.filter((w) => w.word !== word));
  };

  // Speak word using Web Speech API
  const handleSpeak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  // Play audio URL
  const handlePlayAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  };

  // Get daily review
  const handleReview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/review?count=5");
      if (res.ok) {
        const data = await res.json();
        setReviewWords(data.words || []);
        setActiveTab("review");
      }
    } catch {}
    setLoading(false);
  };

  // Key press handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold mb-4">📚 Vocab</h1>
          <p className="text-zinc-400 mb-8 text-lg">
            Look up English words, save them, and get daily review — all with pronunciation.
          </p>
          <button
            onClick={() => signIn("google")}
            className="px-8 py-3 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-3 mx-auto"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">📚 Vocab</h1>
        <div className="flex items-center gap-3">
          <span className="text-zinc-400 text-sm hidden sm:inline">{session.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["lookup", "collection", "review"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {tab === "lookup" ? "🔍 Lookup" : tab === "collection" ? `📦 Collection (${words.length})` : "🎯 Review"}
          </button>
        ))}
      </div>

      {/* Lookup Tab */}
      {activeTab === "lookup" && (
        <div>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type an English word..."
              className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            <button
              onClick={handleLookup}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-medium transition-colors"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>

          {dictError && (
            <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-300 mb-4">{dictError}</div>
          )}

          {dictResult && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold capitalize">{dictResult.word}</h2>
                  {dictResult.pronunciation && (
                    <p className="text-zinc-400 text-lg mt-1">{dictResult.pronunciation}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {dictResult.audioUrl && (
                    <button
                      onClick={() => handlePlayAudio(dictResult.audioUrl)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Play pronunciation"
                    >
                      🔊
                    </button>
                  )}
                  <button
                    onClick={() => handleSpeak(dictResult.word)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="TTS speak"
                  >
                    🗣️
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">{dictResult.pos}</span>
              </div>

              <div>
                <p className="text-zinc-300 text-lg">{dictResult.definition}</p>
              </div>

              {dictResult.example && (
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-zinc-400 italic">💬 &ldquo;{dictResult.example}&rdquo;</p>
                </div>
              )}

              {dictResult.synonyms.length > 0 && (
                <div>
                  <span className="text-zinc-500 text-sm">Synonyms: </span>
                  {dictResult.synonyms.slice(0, 8).map((s) => (
                    <span key={s} className="text-zinc-400 text-sm mr-2">#{s}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAdd}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    addedMsg
                      ? "bg-zinc-700 text-zinc-400 cursor-default"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                  disabled={!!addedMsg}
                >
                  {addedMsg || "Save to Collection"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collection Tab */}
      {activeTab === "collection" && (
        <div>
          {words.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-lg">Your collection is empty</p>
              <p className="text-sm mt-2">Search for words and save them!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {words.map((w) => (
                <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg capitalize">{w.word}</span>
                      <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{w.pos}</span>
                      {w.pronunciation && <span className="text-zinc-500 text-sm">{w.pronunciation}</span>}
                    </div>
                    <p className="text-zinc-300 mt-1 text-sm line-clamp-2">{w.definition}</p>
                    <p className="text-zinc-600 text-xs mt-1">Reviewed {w.timesReviewed}x</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleSpeak(w.word)}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-sm"
                    >🗣️</button>
                    {w.audioUrl && (
                      <button
                        onClick={() => handlePlayAudio(w.audioUrl!)}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-sm"
                      >🔊</button>
                    )}
                    <button
                      onClick={() => handleDelete(w.word)}
                      className="p-1.5 hover:bg-red-900/30 rounded-lg transition-colors text-sm"
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Tab */}
      {activeTab === "review" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400">Spaced repetition — words you need to review</p>
            <button
              onClick={handleReview}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium text-sm transition-colors"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {reviewWords.length === 0 && (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-4xl mb-4">🎯</p>
              <p className="text-lg">Click Refresh to get your daily review</p>
              <p className="text-sm mt-2">Add more words to your collection first!</p>
            </div>
          )}

          {reviewWords.map((w, i) => (
            <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-zinc-500 text-sm">#{i + 1}</span>
                  <h3 className="text-xl font-bold capitalize mt-1">{w.word}</h3>
                  {w.pronunciation && <p className="text-emerald-400 mt-0.5">{w.pronunciation}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleSpeak(w.word)} className="p-2 hover:bg-zinc-800 rounded-lg">🗣️</button>
                  {w.audioUrl && (
                    <button onClick={() => handlePlayAudio(w.audioUrl!)} className="p-2 hover:bg-zinc-800 rounded-lg">🔊</button>
                  )}
                </div>
              </div>
              <p className="text-zinc-300 mb-2">{w.definition}</p>
              {w.example && (
                <p className="text-zinc-500 italic text-sm">💬 &ldquo;{w.example}&rdquo;</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
