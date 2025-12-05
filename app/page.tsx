import { getRecentPosts } from "@/lib/posts";
import FeedClient from "./FeedClient";

// Force dynamic so Next unwraps searchParams properly
export const dynamic = "force-dynamic";

export default async function Home(props: any) {
  // ✅ FIX: unwrap the promise
  const search = await props.searchParams;

  // Safe fallback
  const zone = typeof search?.zone === "string" ? search.zone : "Campus";

  const posts = await getRecentPosts(zone);

  const zones = ["Campus", "Dorm", "Confessions", "Events", "Advice"];

  return (
    <main className="relative min-h-screen bg-[#0d0d0f] text-gray-100 flex flex-col">

      {/* TOP BAR */}
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between bg-[#0d0d0f]/90 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👻</span>
          <span className="font-semibold text-lg tracking-wide">SafeYak</span>
        </div>
        <span className="text-xs text-purple-300">Zone: {zone}</span>
      </header>

      {/* ZONE TABS */}
      <nav className="px-4 py-2 flex gap-3 border-b border-white/10 text-sm overflow-x-auto">
        {zones.map((z) => (
          <a
            key={z}
            href={`/?zone=${z}`}
            className={`
              px-3 py-1 rounded-full border transition
              ${z === zone
                ? "bg-purple-600 border-purple-500 text-white"
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              }
            `}
          >
            {z}
          </a>
        ))}
      </nav>

      {/* FEED */}
      <FeedClient initialPosts={posts} zone={zone} />
    </main>
  );
}
