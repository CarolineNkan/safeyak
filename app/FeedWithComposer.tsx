"use client";

import { useState } from "react";
import { Post } from "@/types/Post";
import PostComposer from "./PostComposer";
import FeedClient from "./FeedClient";

type Props = {
  initialPosts: Post[];
  zone: string;
};

export default function FeedWithComposer({ initialPosts, zone }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  function handlePostCreated(post: Post) {
    // Add the new post to the feed immediately
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div className="flex flex-col flex-1 relative">
      {/* FEED - Scrollable area with bottom padding for composer */}
      <div className="flex-1 overflow-y-auto pb-24">
        <FeedClient 
          initialPosts={posts} 
          zone={zone} 
          onPostCreated={handlePostCreated}
        />
      </div>

      {/* POST COMPOSER - Fixed at bottom (YikYak style) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800 safe-area-bottom">
        <PostComposer zone={zone} onPostCreated={handlePostCreated} />
      </div>
    </div>
  );
}
