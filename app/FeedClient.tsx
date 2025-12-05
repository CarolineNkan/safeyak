"use client";

import { useEffect, useState } from "react";
import { Post } from "@/types/Post";
import { Comment } from "@/types/Comment";
import CommentComposer from "./CommentComposer";
import { supabase } from "@/lib/supabaseClient";
import ReputationBadge from "@/components/ReputationBadge";

type Props = {
  initialPosts: Post[];
  zone: string;
};

// ---- helpers ----
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function getAuthorInitial(hash: string | null) {
  if (!hash) return "👻";
  return hash[0].toUpperCase();
}

export default function FeedClient({ initialPosts, zone }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoadingInitial] = useState(false); // left for future client fetch
  const [toast, setToast] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [authorHash, setAuthorHash] = useState<string | null>(null);

  // Get author hash on mount
  useEffect(() => {
    const hash = window.localStorage.getItem("safeyak_author_hash");
    setAuthorHash(hash);
  }, []);

  // ---------- Realtime Posts ----------
  useEffect(() => {
    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          const newPost = payload.new as Post;
          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            if (newPost.zone !== zone) return prev;
            return [newPost, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zone]);

  // ---------- Realtime Comments ----------
  useEffect(() => {
    const channel = supabase
      .channel("realtime-comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: any) => {
          const newComment = payload.new as Comment;
          setComments((prev) => ({
            ...prev,
            [newComment.post_id]: [
              ...(prev[newComment.post_id] || []),
              newComment,
            ],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------- Realtime Reputation Updates ----------
  useEffect(() => {
    const channel = supabase
      .channel("reputation-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reputation" },
        (payload: any) => {
          const { author_hash, reputation } = payload.new;
          
          setPosts((prev) =>
            prev.map((p) =>
              p.author_hash === author_hash
                ? { ...p, reputation }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------- Load Comments ----------
  async function loadComments(postId: string) {
    if (comments[postId]) {
      setExpandedPostId(expandedPostId === postId ? null : postId);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        setToast("Could not load replies.");
        return;
      }

      setComments((prev) => ({
        ...prev,
        [postId]: (data || []) as Comment[],
      }));
      setExpandedPostId(postId);
    } catch {
      setToast("Something went wrong loading replies.");
    }
  }

  // ---------- New Comment Handler ----------
  function handleCommentCreated(
    postId: string,
    comment: Comment,
    locked: boolean
  ) {
    setComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), comment],
    }));

    if (locked) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, locked: true } : p))
      );
    }
  }

  // ---------- Voting ----------
  async function handleVote(postId: string, dir: 1 | -1) {
    const stored = window.localStorage.getItem("safeyak_author_hash");
    if (!stored) {
      setToast("Anonymous identity error.");
      return;
    }

    // optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const score = p.score ?? 0;
        const up = p.upvotes ?? 0;
        const down = p.downvotes ?? 0;
        return {
          ...p,
          score: score + dir,
          upvotes: dir === 1 ? up + 1 : up,
          downvotes: dir === -1 ? down + 1 : down,
        };
      })
    );

    const { error } = await supabase.rpc("cast_vote", {
      p_post_id: postId,
      p_user_hash: stored,
      p_new_vote: dir,
    });

    if (error) {
      console.error(error);
      setToast("Vote failed.");
    }
  }

  // ---------- Bookmarks ----------
  async function handleBookmark(postId: string) {
    const stored = window.localStorage.getItem("safeyak_author_hash");
    if (!stored) {
      setToast("Anonymous identity error.");
      return;
    }

    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, bookmarks_count: (p.bookmarks_count ?? 0) + 1 }
          : p
      )
    );

    const { error } = await supabase.rpc("toggle_bookmark", {
      p_post_id: postId,
      p_user_hash: stored,
    });

    if (error) {
      console.error(error);
      setToast("Could not update bookmark.");
    }
  }

  // ---------- Edit Post ----------
  function startEdit(post: Post) {
    setEditingPostId(post.id);
    setEditBody(post.body);
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditBody("");
  }

  async function saveEdit(postId: string) {
    if (!editBody.trim() || !authorHash) {
      setToast("Cannot save empty post.");
      return;
    }

    try {
      const res = await fetch("/api/editPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          body: editBody,
          authorHash,
        }),
      });

      if (!res.ok) {
        setToast("Failed to update post.");
        return;
      }

      const updated = await res.json();

      // Update local state
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...updated } : p))
      );

      setEditingPostId(null);
      setEditBody("");
      setToast("Post updated!");
    } catch (error) {
      console.error("Edit error:", error);
      setToast("Something went wrong.");
    }
  }

  // ---------- Delete Post ----------
  async function handleDelete(postId: string) {
    if (!authorHash) {
      setToast("Anonymous identity error.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this post? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      const res = await fetch("/api/deletePost", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          authorHash,
        }),
      });

      if (!res.ok) {
        setToast("Failed to delete post.");
        return;
      }

      // Remove from UI
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setToast("Post deleted.");
    } catch (error) {
      console.error("Delete error:", error);
      setToast("Something went wrong.");
    }
  }

  // ---------- UI ----------
  const showSkeletons = isLoadingInitial && posts.length === 0;

  return (
    <div className="relative flex flex-col h-full pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-black/80 text-xs px-4 py-2 rounded-full border border-white/10">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 px-3 pt-3">
        {showSkeletons &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="neon-card skeleton h-24 rounded-2xl border border-slate-800"
            />
          ))}

        {!showSkeletons && posts.length === 0 && (
          <p className="text-gray-500 text-center mt-6 text-sm">
            No posts yet in this zone 👻
          </p>
        )}

        {posts.map((post) => {
          const score = post.score ?? 0;
          const hidden = post.is_hidden;
          const blurred = post.is_blurred;
          const bookmarks = post.bookmarks_count ?? 0;
          const isAuthor = authorHash && post.author_hash === authorHash;
          const isEditing = editingPostId === post.id;

          return (
            <div
              key={post.id}
              className="neon-card bg-slate-950/80 border border-slate-800/80 px-3 py-3 flex flex-col gap-2"
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="ghost-avatar">
                  {getAuthorInitial(post.author_hash)}
                </div>
                <ReputationBadge score={post.reputation ?? 0} />
                <div className="flex flex-col text-[10px] leading-tight">
                  <span className="uppercase tracking-wide text-violet-300">
                    {post.zone}
                  </span>
                  <span className="text-slate-400">
                    {timeAgo(post.created_at)}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="mt-1 text-sm">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 resize-none focus:outline-none focus:border-violet-500"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(post.id)}
                        className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : hidden ? (
                  <p className="text-slate-500 italic text-xs">
                    [Hidden for safety]
                  </p>
                ) : blurred ? (
                  <div className="relative">
                    <p className="blur-sm text-sm leading-relaxed select-none">
                      {post.body}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      ⚠️ Content may be offensive
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-50 whitespace-pre-line">
                    {post.body}
                  </p>
                )}
              </div>

              {post.locked && (
                <div className="mt-1 bg-red-900/30 border border-red-500/40 px-2 py-1 rounded">
                  <p className="text-[10px] text-red-300">
                    🚫 Thread locked due to repeated violations
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  {/* Voting */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleVote(post.id, 1)}
                      className="px-1 py-0.5 rounded hover:bg-slate-800"
                    >
                      ⬆
                    </button>
                    <span className="min-w-[2ch] text-center text-[11px]">
                      {score}
                    </span>
                    <button
                      onClick={() => handleVote(post.id, -1)}
                      className="px-1 py-0.5 rounded hover:bg-slate-800"
                    >
                      ⬇
                    </button>
                  </div>

                  {/* Comments */}
                  {!hidden && (
                    <button
                      onClick={() => loadComments(post.id)}
                      className="flex items-center gap-1 hover:text-slate-100"
                    >
                      💬
                      <span className="text-[11px]">
                        {expandedPostId === post.id ? "Hide" : "Replies"}
                      </span>
                    </button>
                  )}

                  {/* Bookmark */}
                  {!hidden && (
                    <button
                      onClick={() => handleBookmark(post.id)}
                      className="flex items-center gap-1 hover:text-yellow-300"
                    >
                      ⭐
                      <span className="text-[11px]">{bookmarks}</span>
                    </button>
                  )}

                  {/* Edit (only for author) */}
                  {isAuthor && !hidden && !isEditing && (
                    <button
                      onClick={() => startEdit(post)}
                      className="flex items-center gap-1 hover:text-blue-300"
                    >
                      ✏️
                      <span className="text-[11px]">Edit</span>
                    </button>
                  )}

                  {/* Delete (only for author) */}
                  {isAuthor && !isEditing && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center gap-1 hover:text-red-300"
                    >
                      🗑️
                      <span className="text-[11px]">Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              {expandedPostId === post.id && !hidden && (
                <div className="mt-3 pl-3 border-l border-slate-800 space-y-3">
                  {comments[post.id]?.length ? (
                    comments[post.id].map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2"
                      >
                        {c.is_hidden ? (
                          <p className="text-slate-500 italic text-xs">
                            [Comment removed for safety]
                          </p>
                        ) : c.is_blurred ? (
                          <p className="blur-sm text-xs select-none">
                            {c.body}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-100">{c.body}</p>
                        )}
                        <p className="mt-1 text-[9px] text-slate-500">
                          {timeAgo(c.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      No replies yet.
                    </p>
                  )}

                  <CommentComposer
                    postId={post.id}
                    locked={post.locked ?? false}
                    onCommentCreated={(comment, locked) =>
                      handleCommentCreated(post.id, comment, locked)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
