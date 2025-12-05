"use client";

import { useState, useEffect } from "react";
import { Post } from "@/types/Post";
import { Comment } from "@/types/Comment";
import CommentComposer from "./CommentComposer";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  initialPosts: Post[];
  zone: string;
  onPostCreated: (post: Post) => void;
};

export default function FeedClient({ initialPosts, zone, onPostCreated }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});

  // ========================================================
  // 🔥 REALTIME: POSTS
  // ========================================================
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

  // ========================================================
  // 🔥 REALTIME: COMMENTS
  // ========================================================
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

  // ========================================================
  // 📥 LOAD COMMENTS FOR A POST
  // ========================================================
  async function loadComments(postId: string) {
    if (comments[postId]) {
      setExpandedPostId(expandedPostId === postId ? null : postId);
      return;
    }

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments((prev) => ({ ...prev, [postId]: data }));
      setExpandedPostId(postId);
    }
  }

  // ========================================================
  // ➕ NEW COMMENT CREATED
  // ========================================================
  function handleCommentCreated(postId: string, comment: Comment, locked: boolean) {
    // Add new comment into state
    setComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), comment],
    }));

    // Update locked status if thread becomes locked
    if (locked) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, locked: true } : p))
      );
    }
  }



  // Helper function to format time ago
  function timeAgo(dateString: string): string {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return past.toLocaleDateString();
  }

  // ========================================================
  // UI
  // ========================================================
  return (
    <div className="flex flex-col gap-3 p-4">

      {/* EMPTY STATE */}
      {posts.length === 0 && (
        <p className="text-gray-400 text-center mt-8">No posts yet in this zone.</p>
      )}

      {/* POSTS - YikYak style white cards */}
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-2xl p-4 shadow-lg"
        >
          {/* POST HEADER - Avatar + Time */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
              👤
            </div>
            <span className="text-xs text-gray-500">{timeAgo(post.created_at)}</span>
          </div>

          {/* THREAD LOCKED BANNER */}
          {post.locked && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">
                🚫 Thread locked
              </p>
            </div>
          )}

          {/* POST CONTENT */}
          {post.is_hidden ? (
            <p className="text-gray-400 italic text-sm">[Hidden for safety]</p>
          ) : (
            <>
              {post.is_blurred ? (
                <div
                  className="blur-sm hover:blur-none cursor-pointer transition text-base leading-relaxed text-gray-900"
                  title="Tap to reveal"
                >
                  {post.body}
                </div>
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-line text-gray-900">{post.body}</p>
              )}
            </>
          )}

          {/* ACTION BAR - YikYak style */}
          {!post.is_hidden && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => loadComments(post.id)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <span>💬</span>
                <span>{comments[post.id]?.length || 0}</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                <span>⬆️</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                <span>⬇️</span>
              </button>
            </div>
          )}

          {/* COMMENTS SECTION */}
          {expandedPostId === post.id && !post.is_hidden && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {comments[post.id]?.length > 0 && (
                <div className="space-y-2 mb-4">
                  {comments[post.id].map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-[10px]">
                          👤
                        </div>
                        <span className="text-[10px] text-gray-500">{timeAgo(comment.created_at)}</span>
                      </div>
                      {comment.is_blurred ? (
                        <div className="blur-sm hover:blur-none cursor-pointer transition text-sm text-gray-800">
                          {comment.body}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-line text-gray-800">{comment.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* COMMENT COMPOSER */}
              <CommentComposer
                postId={post.id}
                locked={post.locked}
                onCommentCreated={(comment, locked) =>
                  handleCommentCreated(post.id, comment, locked)
                }
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
