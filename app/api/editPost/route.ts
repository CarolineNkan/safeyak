import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { postId, body, authorHash } = await req.json();

    if (!postId || !body || !authorHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("author_hash")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (post.author_hash !== authorHash) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Re-moderate the edited content
    const modRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body }),
    });
    const mod = await modRes.json();

    // Update post with NEW moderation flags (don't reset locked status)
    const { data: updated, error: updateError } = await supabase
      .from("posts")
      .update({
        body,
        is_blurred: mod.blur ?? false,
        is_hidden: mod.hide ?? false,
        moderation_reason: mod.reason ?? null,
        // Note: locked status is NOT reset - threads stay locked
      })
      .eq("id", postId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update post" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Edit post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
