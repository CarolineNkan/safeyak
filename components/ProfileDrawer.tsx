"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReputationBadge from "./ReputationBadge";
import type { ProfileStats } from "@/types/UserProfile";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authorHash: string;
}

export default function ProfileDrawer({ isOpen, onClose, authorHash }: ProfileDrawerProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && authorHash) {
      fetchProfileStats();
    }
  }, [isOpen, authorHash]);

  // Real-time reputation updates
  useEffect(() => {
    if (!isOpen || !authorHash) return;

    const channel = supabase
      .channel("profile-reputation-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reputation" },
        (payload: any) => {
          if (payload.new.author_hash === authorHash) {
            fetchProfileStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, authorHash]);

  async function fetchProfileStats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_profile_stats", {
        p_hash: authorHash,
      });

      if (error) {
        console.error("Error fetching profile stats:", error);
        return;
      }

      setStats(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  function getProgressToNextTier(score: number) {
    const tiers = [0, 21, 51, 101, 251];
    const currentTierIndex = tiers.findIndex(
      (t, i) => score >= t && (i === tiers.length - 1 || score < tiers[i + 1])
    );

    if (currentTierIndex === tiers.length - 1) {
      return { progress: 100, current: score, next: score };
    }

    const currentTier = tiers[currentTierIndex];
    const nextTier = tiers[currentTierIndex + 1];
    const progress = ((score - currentTier) / (nextTier - currentTier)) * 100;

    return { progress, current: score, next: nextTier };
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  }

  if (!isOpen) return null;

  const progressData = stats ? getProgressToNextTier(stats.reputation) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-violet-500/30 rounded-t-3xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh" }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          aria-label="Close profile"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "85vh" }}>
          {/* Ghost Avatar */}
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center text-5xl">
              👻
            </div>
          </div>

          {/* Reputation Badge */}
          {stats && (
            <div className="flex justify-center mb-6">
              <div className="scale-125">
                <ReputationBadge score={stats.reputation} />
              </div>
            </div>
          )}

          {loading && !stats && (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          )}

          {!loading && !stats && (
            <div className="text-center text-slate-400 py-8">
              Unable to load profile
            </div>
          )}

          {stats && (
            <>
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.post_count}
                  </div>
                  <div className="text-xs text-slate-400">Posts</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.comment_count}
                  </div>
                  <div className="text-xs text-slate-400">Comments</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.upvotes_received}
                  </div>
                  <div className="text-xs text-slate-400">Upvotes</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {stats.bookmarks_received}
                  </div>
                  <div className="text-xs text-slate-400">Bookmarks</div>
                </div>
              </div>

              {/* Join Date */}
              <div className="text-center text-sm text-slate-400 mb-6">
                Joined {formatDate(stats.joined_at)}
              </div>

              {/* Progress Bar */}
              {progressData && progressData.progress < 100 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>{progressData.current} XP</span>
                    <span>{progressData.next} XP</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-full transition-all duration-500"
                      style={{ width: `${progressData.progress}%` }}
                    />
                  </div>
                  <div className="text-center text-xs text-slate-400 mt-2">
                    {Math.round(progressData.progress)}% to next tier
                  </div>
                </div>
              )}

              {progressData && progressData.progress === 100 && (
                <div className="bg-slate-900/50 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <div className="text-yellow-500 font-semibold">
                    🎉 Max Tier Reached!
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
