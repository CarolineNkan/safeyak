// app/api/comments/create/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/* ---------------------------------------------------
   SUPABASE SERVER CLIENT
-----------------------------------------------------*/
async function getSupabase() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );
}

/* ---------------------------------------------------
   POST /api/comments/create
-----------------------------------------------------*/
export async function POST(req: Request) {
  try {
    const supabase = await getSupabase();
    const { post_id, body, author_hash, is_blurred, is_hidden } = await req.json();

    if (!post_id || !body || !author_hash) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    /* ---------------------------------------------
       1. INSERT COMMENT
    ----------------------------------------------*/
    const { data: createdComment, error: commentErr } = await supabase
      .from("comments")
      .insert({
        post_id,
        body,
        author_hash,
        is_blurred: Boolean(is_blurred),
        is_hidden: Boolean(is_hidden),
      })
      .select("*")
      .single();

    if (commentErr) {
      console.error("Comment insert error:", commentErr);
      return NextResponse.json(
        { error: "Failed to create comment." },
        { status: 500 }
      );
    }

    /* ---------------------------------------------
       2. AUTO-LOCK THREAD IF TOXIC
    ----------------------------------------------*/
    await supabase.rpc("lock_if_toxic", {
      post_id: createdComment.post_id,
    });

    /* ---------------------------------------------
       3. Get updated post lock status
    ----------------------------------------------*/
    const { data: postData } = await supabase
      .from("posts")
      .select("locked")
      .eq("id", post_id)
      .single();

    return NextResponse.json({
      success: true,
      comment: createdComment,
      locked: postData?.locked ?? false,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

