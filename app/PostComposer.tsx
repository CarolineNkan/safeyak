"use client";

import { useState } from "react";

export default function PostComposer({
  zone,
  onPostCreated,
}: {
  zone: string;
  onPostCreated: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) return;

    setLoading(true);

    try {
      // Notify FeedClient — it will call createPost()
      await onPostCreated(body);
      setBody(""); // clear textarea
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder={`Share something with ${zone} (anonymously)...`}
        className="flex-1 rounded-lg bg-black/40 border border-white/10 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="self-end px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Posting..." : "Post"}
      </button>
    </div>
  );
}
