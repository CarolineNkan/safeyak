# Design Document

## Overview

The Reputation System enhances SafeYak by providing visual feedback on user contributions through badges, statistics, and real-time updates. The system integrates seamlessly with the existing YikYak-inspired dark neon UI and leverages Supabase RPC functions and real-time subscriptions.

## Architecture

### Component Hierarchy

```
FeedWithComposer
├── FeedClient
│   ├── Post Cards
│   │   ├── Ghost Avatar
│   │   ├── ReputationBadge (NEW)
│   │   ├── Post Content
│   │   └── Actions (vote, comment, bookmark)
│   └── Real-time Subscriptions
│       ├── Posts Channel
│       ├── Comments Channel
│       └── Reputation Channel (NEW)
└── PostComposer

Layout
└── Bottom Navigation (NEW)
    └── Profile Button (NEW)
        └── ProfileDrawer (NEW)
```

### Data Flow

1. **Initial Load**: FeedWithComposer fetches posts → fetches reputation for each author → merges data → passes to FeedClient
2. **Real-time Updates**: Supabase broadcasts reputation changes → FeedClient updates affected badges
3. **Profile View**: User clicks profile button → ProfileDrawer fetches stats via get_profile_stats RPC → displays with progress bar

## Components and Interfaces

### 1. ReputationBadge Component

**Location**: `components/ReputationBadge.tsx`

**Props**:
```typescript
interface ReputationBadgeProps {
  score: number;
}
```

**Badge Tiers**:
- 0-20: 🐣 Rookie
- 21-50: 🔥 Active
- 51-100: ⭐ Trusted
- 101-250: 💎 Elite
- 251+: 👑 Legend

**Styling**:
- Small pill shape (rounded-full)
- Neon border matching card design
- text-xs font size
- Subtle glow effect
- Dark background with transparency

**Implementation**:
```typescript
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
```

### 2. Reputation API Route

**Location**: `app/api/reputation/route.ts`

**Endpoint**: `GET /api/reputation?hash={author_hash}`

**Response**:
```typescript
{
  reputation: number;
}
```

**Implementation**:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");
  
  if (!hash) {
    return Response.json({ reputation: 0 });
  }
  
  const { data, error } = await supabase.rpc("get_reputation", {
    p_hash: hash
  });
  
  if (error) {
    console.error(error);
    return Response.json({ reputation: 0 });
  }
  
  return Response.json({ reputation: data ?? 0 });
}
```

### 3. ProfileDrawer Component

**Location**: `components/ProfileDrawer.tsx`

**Props**:
```typescript
interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authorHash: string;
}
```

**Features**:
- Slide-up animation from bottom
- Blurred backdrop overlay
- Ghost avatar (large, centered)
- Reputation badge (prominent)
- Statistics grid:
  - Posts count
  - Comments count
  - Upvotes received
  - Bookmarks received
  - Join date
- Progress bar showing advancement to next tier
- Close button (X icon, top-right)

**Styling**:
- Dark background (bg-slate-950)
- Neon border (border-violet-500/30)
- Backdrop blur (backdrop-blur-md)
- Smooth transitions
- Safe area padding for mobile

**Progress Bar Logic**:
```typescript
function getProgressToNextTier(score: number) {
  const tiers = [0, 21, 51, 101, 251];
  const currentTierIndex = tiers.findIndex((t, i) => 
    score >= t && (i === tiers.length - 1 || score < tiers[i + 1])
  );
  
  if (currentTierIndex === tiers.length - 1) {
    return { progress: 100, current: score, next: score };
  }
  
  const currentTier = tiers[currentTierIndex];
  const nextTier = tiers[currentTierIndex + 1];
  const progress = ((score - currentTier) / (nextTier - currentTier)) * 100;
  
  return { progress, current: score, next: nextTier };
}
```

### 4. FeedWithComposer Updates

**New Functionality**:
- Fetch reputation for all post authors after initial load
- Merge reputation data into posts
- Pass enriched posts to FeedClient

**Implementation**:
```typescript
useEffect(() => {
  async function enrichPostsWithReputation() {
    const hashes = [...new Set(initialPosts.map(p => p.author_hash).filter(Boolean))];
    
    const reputationMap: Record<string, number> = {};
    
    await Promise.all(
      hashes.map(async (hash) => {
        const res = await fetch(`/api/reputation?hash=${hash}`);
        const data = await res.json();
        reputationMap[hash!] = data.reputation;
      })
    );
    
    const enriched = initialPosts.map(post => ({
      ...post,
      reputation: post.author_hash ? reputationMap[post.author_hash] : 0
    }));
    
    setPosts(enriched);
  }
  
  enrichPostsWithReputation();
}, [initialPosts]);
```

### 5. FeedClient Updates

**New Features**:
- Display ReputationBadge next to avatar
- Subscribe to reputation updates channel
- Update badges when reputation changes

**Real-time Subscription**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel("reputation-updates")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "reputation" },
      (payload: any) => {
        const { author_hash, reputation } = payload.new;
        
        setPosts((prev) =>
          prev.map((p) =>
            p.author_hash === author_hash
              ? { ...p, reputation }
              : p
          )
        );
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 6. Layout Updates

**New Features**:
- Bottom navigation bar with profile button
- State management for ProfileDrawer

**Implementation**:
```typescript
"use client";

import { useState } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";

export default function RootLayout({ children }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [authorHash, setAuthorHash] = useState("");
  
  useEffect(() => {
    const hash = window.localStorage.getItem("safeyak_author_hash");
    if (hash) setAuthorHash(hash);
  }, []);
  
  return (
    <html lang="en">
      <body>
        {children}
        
        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 px-4 py-3 flex justify-around items-center">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-400 transition"
          >
            <span className="text-xl">👤</span>
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
        
        <ProfileDrawer
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          authorHash={authorHash}
        />
      </body>
    </html>
  );
}
```

## Data Models

### Extended Post Type

```typescript
export type Post = {
  id: string;
  zone: string;
  body: string;
  votes: number;
  created_at: string;
  author_hash: string | null;
  is_hidden: boolean;
  is_blurred?: boolean;
  locked?: boolean;
  score?: number;
  upvotes?: number;
  downvotes?: number;
  bookmarks_count?: number;
  comment_count?: number;
  reputation?: number; // NEW - author's reputation
};
```

### UserProfile Type

```typescript
export type UserProfile = {
  author_hash: string;
  reputation: number;
  post_count: number;
  comment_count: number;
  upvotes_received: number;
  bookmarks_received: number;
  joined_at: string;
};
```

### ProfileStats Type

```typescript
export type ProfileStats = {
  reputation: number;
  post_count: number;
  comment_count: number;
  upvotes_received: number;
  bookmarks_received: number;
  joined_at: string;
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Badge rendering for all posts

*For any* post with an author_hash, the rendered post card should include a ReputationBadge component displaying the author's reputation tier.

**Validates: Requirements 1.1**

### Property 2: API returns numeric reputation

*For any* valid author hash, calling the reputation API should return a response containing a numeric reputation value.

**Validates: Requirements 2.2**

### Property 3: Posts enriched with reputation

*For any* set of loaded posts, each post with an author_hash should have its reputation field populated after the enrichment process completes.

**Validates: Requirements 2.4**

### Property 4: Profile statistics completeness

*For any* user profile data, the rendered profile drawer should display all required statistics: post count, comment count, upvotes received, and bookmarks received.

**Validates: Requirements 3.3**

### Property 5: Progress bar accuracy

*For any* reputation score below 251, the progress bar should show a percentage between 0-100 representing advancement toward the next badge tier, calculated as (current - tier_min) / (tier_max - tier_min) * 100.

**Validates: Requirements 3.5**

### Property 6: Profile drawer interaction

*For any* application state, clicking the profile button should transition the drawer from closed to open, and clicking the close button should transition from open to closed.

**Validates: Requirements 4.2, 4.3**

### Property 7: Real-time reputation updates

*For any* reputation change in the database, all posts by that author currently displayed in the feed should have their reputation badge updated to reflect the new value.

**Validates: Requirements 5.1, 5.2**

### Property 8: Profile drawer real-time sync

*For any* reputation change while the profile drawer is open, the displayed statistics should update to reflect the new reputation value without requiring a manual refresh.

**Validates: Requirements 5.3**

### Property 9: Consistent neon styling

*For any* reputation badge rendered, the component should include CSS classes for neon borders (border-*-500/50) consistent with the existing card design system.

**Validates: Requirements 7.1**

### Property 10: Avatar styling consistency

*For any* reputation component that includes an avatar, the avatar element should maintain the ghost-avatar CSS class and styling.

**Validates: Requirements 7.3**

## Error Handling

### API Errors

1. **Missing Author Hash**: Return default reputation of 0
2. **RPC Function Failure**: Log error, return 0, display toast notification
3. **Network Timeout**: Retry once, then fail gracefully with cached data

### Real-time Subscription Errors

1. **Connection Loss**: Supabase client auto-reconnects
2. **Channel Subscription Failure**: Log error, continue with polling fallback
3. **Invalid Payload**: Validate payload structure before processing

### UI Errors

1. **Profile Stats Fetch Failure**: Display "Unable to load profile" message
2. **Invalid Reputation Score**: Clamp to 0 minimum, display Rookie badge
3. **Missing Author Hash**: Display default ghost avatar without badge

## Testing Strategy

### Unit Tests

**ReputationBadge Component**:
- Test badge tier selection for boundary values (0, 20, 21, 50, 51, 100, 101, 250, 251)
- Test emoji and label rendering for each tier
- Test CSS class application

**Reputation API Route**:
- Test valid author hash returns numeric value
- Test missing hash returns 0
- Test invalid hash returns 0

**ProfileDrawer Component**:
- Test drawer opens/closes on button clicks
- Test statistics display with mock data
- Test progress bar calculation for various scores

**Progress Bar Logic**:
- Test progress calculation at tier boundaries
- Test max tier (251+) returns 100% progress
- Test mid-tier progress accuracy

### Property-Based Tests

**Property 1: Badge Tier Consistency**
- Generate random reputation scores (0-1000)
- Verify badge tier matches expected tier for that score
- Verify tier boundaries are respected

**Property 2: Reputation Enrichment**
- Generate random sets of posts with author hashes
- Verify all posts have reputation field after enrichment
- Verify reputation values are non-negative numbers

**Property 3: Real-time Update Propagation**
- Generate random reputation updates
- Verify all affected posts update their badges
- Verify unaffected posts remain unchanged

**Property 4: Progress Bar Bounds**
- Generate random reputation scores
- Verify progress is always between 0-100
- Verify progress increases monotonically within a tier

### Integration Tests

1. **End-to-End Reputation Flow**:
   - Create post → verify badge appears
   - Receive upvote → verify reputation increases
   - Verify badge updates in real-time

2. **Profile Drawer Flow**:
   - Click profile button → verify drawer opens
   - Verify all stats load correctly
   - Receive reputation update → verify stats update
   - Click close → verify drawer closes

3. **Multi-User Scenario**:
   - Multiple users with different reputation levels
   - Verify correct badges for each user
   - Verify real-time updates don't cross-contaminate

## Performance Considerations

### Reputation Fetching

- **Batch API Calls**: Fetch reputation for all unique author hashes in parallel
- **Caching**: Cache reputation values in component state to avoid redundant fetches
- **Debouncing**: Debounce real-time updates to prevent excessive re-renders

### Real-time Subscriptions

- **Single Channel**: Use one reputation channel for all updates
- **Selective Updates**: Only update posts currently in view
- **Cleanup**: Properly unsubscribe on component unmount

### Profile Drawer

- **Lazy Loading**: Only fetch profile stats when drawer opens
- **Memoization**: Memoize progress bar calculations
- **Animation Performance**: Use CSS transforms for smooth animations

## Security Considerations

1. **Author Hash Privacy**: Never expose author hashes in client-side logs
2. **API Rate Limiting**: Implement rate limiting on reputation API endpoint
3. **RPC Function Security**: Ensure get_reputation and get_profile_stats have proper RLS policies
4. **Input Validation**: Validate author hash format before making API calls

## Deployment Notes

1. **Database Migration**: Ensure Phase 1 migrations are applied before deploying Phase 2
2. **Environment Variables**: No new environment variables required
3. **Build Verification**: Run TypeScript compilation to verify zero errors
4. **Real-time Testing**: Test real-time subscriptions in production-like environment
5. **Mobile Testing**: Verify profile drawer animations on iOS and Android
