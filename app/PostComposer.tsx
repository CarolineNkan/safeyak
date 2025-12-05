"use client";

import { useState } from "react";

export default function PostComposer({ zone, onPostCreated }: {
  zone: string;
  onPostCreated: (post: any) => void;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);

    try {
      // 1. Send content to moderation API
      const modRes = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });

      const mod = await modRes.json();

      // Fallback if moderation fails
      const is_blurred = mod.blur ?? false;
      const is_hidden = mod.hide ?? false;
      const moderation_reason = mod.reason ?? null;

      // Get or create author hash
      let authorHash = localStorage.getItem("safeyak_author_hash");
      if (!authorHash) {
        authorHash = crypto.randomUUID();
        localStorage.setItem("safeyak_author_hash", authorHash);
      }

      // 2. Create post via server logic
      const createRes = await fetch("/api/createPost", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-author-hash": authorHash,
        },
        body: JSON.stringify({
          body,
          zone,
          is_blurred,
          is_hidden,
          moderation_reason,
        }),
      });

      const newPost = await createRes.json();

      if (newPost) {
        onPostCreated(newPost);
        setBody("");
      }
    } catch (err) {
      console.error("PostComposer error:", err);
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4"
    >
      {/* Safety notice */}
      <p className="text-[10px] text-slate-500 mb-2 px-1">
        🚫 Do not post bullying, threats, or harassment. Harmful posts will be hidden.
      </p>

      {/* YikYak-style bottom input bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          disabled={loading}
          className="flex-1 px-5 py-3 rounded-full bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 transition"
        />
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="rounded-full px-5 py-3 bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Post"}
        </button>
      </div>
    </form>
  );
}
