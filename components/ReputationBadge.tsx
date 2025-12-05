interface ReputationBadgeProps {
  score: number;
}

export default function ReputationBadge({ score }: ReputationBadgeProps) {
  const getBadge = (score: number) => {
    if (score >= 251) return { emoji: "👑", label: "Legend", color: "border-yellow-500/50" };
    if (score >= 101) return { emoji: "💎", label: "Elite", color: "border-cyan-500/50" };
    if (score >= 51) return { emoji: "⭐", label: "Trusted", color: "border-blue-500/50" };
    if (score >= 21) return { emoji: "🔥", label: "Active", color: "border-orange-500/50" };
    return { emoji: "🐣", label: "Rookie", color: "border-slate-500/50" };
  };
  
  const badge = getBadge(score);
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${badge.color} bg-slate-950/80 text-xs`}>
      <span>{badge.emoji}</span>
      <span className="text-slate-300">{badge.label}</span>
    </div>
  );
}
