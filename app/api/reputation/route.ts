import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get("hash");

    if (!hash) {
      return NextResponse.json(
        { error: "Missing hash parameter" },
        { status: 400 }
      );
    }

    const supabase = await getSupabase();

    // Call get_reputation RPC
    const { data, error } = await supabase.rpc("get_reputation", {
      p_hash: hash,
    });

    if (error) {
      console.error("Error fetching reputation:", error);
      return NextResponse.json({ reputation: 0 });
    }

    return NextResponse.json({ reputation: data ?? 0 });
  } catch (error) {
    console.error("Reputation API error:", error);
    return NextResponse.json({ reputation: 0 });
  }
}
