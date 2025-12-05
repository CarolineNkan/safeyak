import { getRecentPosts } from "@/lib/posts";
import FeedWithComposer from "./FeedWithComposer";

// Force dynamic so searchParams works correctly in Next.js
export const dynamic = "force-dynamic";

export default async function Home(props: any) {
  const search = await props.searchParams;

  const zone =
    typeof search?.zone === "string" ? search.zone : "Campus";

  const posts = await getRecentPosts(zone);

  const zones = ["Campus", "Dorm", "Confessions", "Events", "Advice"];

  return (
    <main className="relative min-h-screen bg-[#1a1a1a] text-gray-100 flex flex-col">

      {/* HEADER */}
      <header className="px-4 py-3 flex items-center justify-between bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👻</span>
          <span className="font-bold text-xl tracking-tight">SafeYak</span>
        </div>
      </header>

      {/* ZONE SWITCHER - YikYak style pills */}
      <nav className="px-4 py-3 flex gap-2 border-b border-gray-800 overflow-x-auto bg-[#1a1a1a]">
        {zones.map((z) => (
          <a
            key={z}
            href={`/?zone=${z}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap
              ${
                z === zone
                  ? "bg-white text-black"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }
            `}
          >
            {z}
          </a>
        ))}
      </nav>

      {/* FEED WITH POST COMPOSER */}
      <FeedWithComposer initialPosts={posts} zone={zone} />
    </main>
  );
}
