import { supabase } from "./supabaseClient";

export interface Post {
  id: string;
  zone: string;
  body: string;
  votes: number;
  created_at: string;
  author_hash: string | null;
  is_hidden: boolean;
  is_blurred: boolean;
  moderation_reason: string | null;
}

/**
 * Fetch recent posts for a given zone
 */
export async function getRecentPosts(zone: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("zone", zone)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new post with moderation metadata
 * This version accepts a moderation object injected by Kiro Hooks.
 */
export async function createPost(
  zone: string,
  body: string,
  moderation?: {
    blur?: boolean;
    hide?: boolean;
    reason?: string | null;
  }
): Promise<Post | null> {
  if (!body.trim()) return null;

  // Anonymous identity fingerprint
  let authorHash =
    typeof window !== "undefined"
      ? localStorage.getItem("safeyak_author_hash")
      : null;

  if (!authorHash) {
    authorHash = crypto.randomUUID();
    if (typeof window !== "undefined") {
      localStorage.setItem("safeyak_author_hash", authorHash);
    }
  }

  // Default moderation if none is passed
  const mod = {
    blur: moderation?.blur || false,
    hide: moderation?.hide || false,
    reason: moderation?.reason || null,
  };

  // Insert post into database
  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        zone,
        body,
        votes: 0,
        author_hash: authorHash,
        is_hidden: mod.hide,
        is_blurred: mod.blur,
        moderation_reason: mod.reason,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return null;
  }

  return data as Post;
}
