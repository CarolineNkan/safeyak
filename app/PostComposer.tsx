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
      className="p-3"
    >
      {/* Safety notice */}
      <p className="text-[10px] text-slate-500 mb-1 px-1">
        🚫 Do not post bullying, threats, or harassment. Harmful posts will be hidden.
      </p>

      {/* YikYak-style bottom input bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-full bg-gray-800 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="rounded-full px-4 py-2 bg-slate-200 text-slate-900 text-sm font-medium hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Post"}
        </button>
      </div>
    </form>
  );
}
