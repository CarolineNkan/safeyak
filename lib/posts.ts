// lib/posts.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Post } from "@/types/Post";

export async function getSupabaseServer() {
  // NEXT.JS 15/16 — cookies() MUST be awaited
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          // Supabase SSR requires this to exist but we don't need server writes
        }
      }
    }
  );
}

// -------------------------
// GET RECENT POSTS BY ZONE
// -------------------------
export async function getRecentPosts(zone: string): Promise<Post[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("zone", zone)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error loading posts:", error);
    return [];
  }

  return data as Post[];
}

// -------------------------
// CREATE POST
// -------------------------
export async function createPost({
  body,
  zone,
  author_hash,
  is_blurred,
  is_hidden,
  moderation_reason
}: {
  body: string;
  zone: string;
  author_hash: string;
  is_blurred: boolean;
  is_hidden: boolean;
  moderation_reason: string | null;
}) {

  const supabase = await getSupabaseServer();

  // 1. Rate limit: fetch user
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("hash", author_hash)
    .single();

  if (user?.last_post_at) {
    const seconds = (Date.now() - new Date(user.last_post_at).getTime()) / 1000;
    if (seconds < 15) {
      return { error: "You are posting too fast. Try again shortly." };
    }
  }

  // 2. Insert post
  const { data, error } = await supabase
    .from("posts")
    .insert({
      body,
      zone,
      author_hash,
      is_blurred,
      is_hidden,
      moderation_reason
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return null;
  }

  // 3. Strike logic
  if (is_blurred || is_hidden) {
    await supabase.rpc("increment_strike", {
      user_hash: author_hash
    });
  }

  // 4. Update last_post_at
  await supabase
    .from("users")
    .update({ last_post_at: new Date().toISOString() })
    .eq("hash", author_hash);

  return data;
}
