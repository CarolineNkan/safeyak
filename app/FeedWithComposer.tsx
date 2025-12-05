"use client";

import { useState, useEffect } from "react";
import { Post } from "@/types/Post";
import PostComposer from "./PostComposer";
import FeedClient from "./FeedClient";

type Props = {
  initialPosts: Post[];
  zone: string;
};

export default function FeedWithComposer({ initialPosts, zone }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // Enrich posts with reputation data after initial load
  useEffect(() => {
    async function enrichPostsWithReputation() {
      // Extract unique author hashes, filtering out null/undefined values
      const hashes = [...new Set(initialPosts.map(p => p.author_hash).filter(Boolean))];
      
      if (hashes.length === 0) {
        return;
      }
      
      // Create reputation map from author_hash to reputation score
      const reputationMap: Record<string, number> = {};
      
      // Fetch reputation for all unique author hashes in parallel
      await Promise.all(
        hashes.map(async (hash) => {
          try {
            const res = await fetch(`/api/reputation?hash=${hash}`);
            const data = await res.json();
            reputationMap[hash!] = data.reputation;
          } catch (error) {
            console.error(`Failed to fetch reputation for ${hash}:`, error);
            reputationMap[hash!] = 0;
          }
        })
      );
      
      // Merge reputation data into posts state
      const enriched = initialPosts.map(post => ({
        ...post,
        reputation: post.author_hash ? reputationMap[post.author_hash] : 0
      }));
      
      setPosts(enriched);
    }
    
    enrichPostsWithReputation();
  }, [initialPosts]);

  function handlePostCreated(post: Post) {
    // Add the new post to the feed immediately
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div className="flex flex-col flex-1 relative">
      {/* FEED - Scrollable area with bottom padding for composer */}
      <div className="flex-1 overflow-y-auto pb-32">
        <FeedClient 
          initialPosts={posts} 
          zone={zone}
        />
      </div>

      {/* POST COMPOSER - Fixed at bottom (YikYak style) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 safe-area-bottom z-50">
        <PostComposer zone={zone} onPostCreated={handlePostCreated} />
      </div>
    </div>
  );
}
