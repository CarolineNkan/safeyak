# SafeYak Core Spec

## Goal

Build a minimal but extensible anonymous local feed called SafeYak.  
Users can:
- View a list of recent posts in their "zone" (e.g., Campus, Dorm).
- Create anonymous posts.
- See posts update in near real-time.

The system must be:
- Safety-first
- Easy to extend with moderation later
- Simple enough to run in a hackathon demo

## Architecture

- Frontend: Next.js (App Router, TypeScript)
- Styling: Tailwind CSS / simple CSS classes
- Backend: Supabase (Postgres + real-time)
- Data access: Supabase client from `lib/supabaseClient.ts`

## Data Models

### posts

- id (uuid, primary key)
- zone (text)  // e.g. "Campus", "Dorm", "Confessions"
- body (text)
- votes (integer, default 0)
- created_at (timestamp, default now())
- author_hash (text, nullable)  // internal only, not shown to users
- is_hidden (boolean, default false)

## Minimal Features for Day 1

1. Seed Supabase with a `posts` table (no relations yet).
2. Implement a server helper for fetching posts by `zone`.
   - File: `lib/posts.ts`
   - Functions:
     - `getRecentPosts(zone: string)`
3. Update the Next.js homepage to:
   - Fetch posts for `zone = "Campus"`
   - Render them in the existing mockup instead of hardcoded data.
4. Prepare a placeholder function for `createPost(zone, body)` for Day 2.

## Implementation Notes

- Use TypeScript types for the Post model.
- Keep everything simple and explicit.
- Do not over-optimize; this is hackathon code.
