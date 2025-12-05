import { NextRequest, NextResponse } from "next/server";
import { createPost } from "@/lib/posts";

export async function POST(request: NextRequest) {
  try {
    const { body, zone, is_blurred, is_hidden, moderation_reason } = await request.json();

    if (!body || !zone) {
      return NextResponse.json(
        { error: "Missing required fields: body and zone" },
        { status: 400 }
      );
    }

    // Get or create author hash from request
    // In a real app, this would come from authenticated session
    let authorHash = request.headers.get("x-author-hash");
    
    if (!authorHash) {
      // Generate a new hash if not provided
      authorHash = crypto.randomUUID();
    }

    // Create the post using the server-side function
    const newPost = await createPost({
      body,
      zone,
      author_hash: authorHash,
      is_blurred: is_blurred ?? false,
      is_hidden: is_hidden ?? false,
      moderation_reason: moderation_reason ?? null,
    });

    if (!newPost) {
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    return NextResponse.json(newPost);
  } catch (error) {
    console.error("Error in createPost API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
