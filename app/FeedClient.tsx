"use client";

import { useEffect, useState } from "react";
import { Post, createPost } from "@/lib/posts";
import PostComposer from "./PostComposer";
import { supabase } from "@/lib/supabaseClient";

export default function FeedClient({
  initialPosts,
  zone,
}: {
  initialPosts: Post[];
  zone: string;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // Refresh posts when zone changes
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts, zone]);

  // Realtime subscription for this specific zone
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-posts-${zone}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `zone=eq.${zone}`,
        },
        (payload) => {
          const newPost = payload.new as Post;

          // Only add if not hidden and not already in list
          setPosts((prev) => {
            // Check for duplicates
            if (prev.some((p) => p.id === newPost.id)) {
              return prev;
            }
            // Add new post to the top
            return [newPost, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zone]);

  // When user creates a post
  async function handlePostCreated(body: string) {
    try {
      // Step 1: Call moderation API (HuggingFace toxic-bert)
      const moderationResponse = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });

      if (!moderationResponse.ok) {
        console.error("Moderation failed, posting without moderation");
      }

      const moderation = await moderationResponse.json();

      // Step 2: Create post with moderation metadata
      // moderation contains: { blur, hide, toxicity, reason }
      await createPost(zone, body, moderation);
      // Real-time subscription will add the post to the feed
    } catch (error) {
      console.error("Error creating post:", error);
      // Fallback: create post without moderation
      await createPost(zone, body);
    }
  }

  return (
    <div className="flex flex-col flex-1">

      {/* FEED */}
      <section className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {posts.map((post) => {
          if (post.is_hidden) return null;

          return (
            <article
              key={post.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-wide text-purple-300 mb-2">
                {post.zone}
              </div>

              {post.moderation_reason && (
                <div className="text-xs text-yellow-400 italic mb-1">
                  ⚠ {post.moderation_reason}
                </div>
              )}

              {post.is_blurred ? (
                <div
                  className="blur-sm hover:blur-none cursor-pointer transition whitespace-pre-line select-none"
                  title="Blurred for safety. Hover to reveal."
                >
                  {post.body}
                </div>
              ) : (
                <p className="text-sm mb-3 whitespace-pre-line">{post.body}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
                <span>▲ {post.votes} ▼</span>
                <span>💬</span>
                <span>✏️</span>
                <span>⭐</span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="border-t border-white/10 p-4 bg-[#0d0d0f]/90 backdrop-blur">
        <PostComposer zone={zone} onPostCreated={handlePostCreated} />
      </div>
    </div>
  );
}
