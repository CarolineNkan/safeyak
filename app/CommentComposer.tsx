"use client";
import { useState } from "react";
import { Comment } from "@/types/Comment";

type Props = {
  postId: string;
  locked: boolean;
  onCommentCreated: (comment: Comment, locked: boolean) => void;
};

export default function CommentComposer({
  postId,
  locked,
  onCommentCreated,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!text.trim() || locked) return;

    setLoading(true);

    try {
      // Get or create author hash
      let authorHash = localStorage.getItem("safeyak_author_hash");
      if (!authorHash) {
        authorHash = crypto.randomUUID();
        localStorage.setItem("safeyak_author_hash", authorHash);
      }

      // Step 1: Call moderation API
      const moderationResponse = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });

      const moderation = await moderationResponse.json();

      // Extract moderation results (with fallbacks)
      const is_blurred = moderation.blur ?? false;
      const is_hidden = moderation.hide ?? false;

      // Step 2: Create comment with moderation metadata
      const response = await fetch("/api/comments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          body: text,
          author_hash: authorHash,
          is_blurred: is_blurred,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Clear input
        setText("");
        // Notify parent with new comment and lock status
        onCommentCreated(result.comment, result.locked);
      } else {
        console.error("Failed to create comment:", result.error);
      }
    } catch (error) {
      console.error("Error creating comment:", error);
    } finally {
      setLoading(false);
    }
  }

  if (locked) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-xs text-red-600">
          🚫 Comments disabled
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a reply..."
        disabled={loading}
        className="flex-1 px-3 py-2 rounded-full bg-gray-100 border border-gray-200 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-gray-300 disabled:opacity-50"
      />
      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        className="px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "..." : "Send"}
      </button>
    </div>
  );
}
