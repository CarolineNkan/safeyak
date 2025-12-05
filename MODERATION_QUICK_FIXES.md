# 🚨 SafeYak Moderation - Quick Fix Guide

## Critical Fixes (Do These NOW - 2 hours)

### Fix #1: Re-Moderate Edited Posts (30 min)

**File**: `app/api/editPost/route.ts`

**Problem**: Editing bypasses moderation completely.

**Solution**:
```typescript
export async function POST(req: NextRequest) {
  try {
    const { postId, body, authorHash } = await req.json();

    // ... ownership verification ...

    // ✅ ADD: Re-moderate the edited content
    const modRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body }),
    });
    const mod = await modRes.json();

    // ✅ CHANGE: Update with NEW moderation flags (don't reset)
    const { data: updated, error: updateError } = await supabase
      .from("posts")
      .update({
        body,
        is_blurred: mod.blur ?? false,      // ✅ Use new moderation result
        is_hidden: mod.hide ?? false,       // ✅ Use new moderation result
        moderation_reason: mod.reason,      // ✅ Use new reason
        // ❌ DON'T reset locked status
      })
      .eq("id", postId)
      .select()
      .single();

    // ... rest of code ...
  }
}
```

---

### Fix #2: Secure Moderation Failure Mode (10 min)

**File**: `app/api/moderate/route.ts`

**Problem**: API failures allow all content through.

**Solution**:
```typescript
export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!process.env.PERSPECTIVE_API_KEY) {
      // ✅ CHANGE: Default to HIDE when API unavailable
      return NextResponse.json({
        error: "Moderation service unavailable",
        blur: true,   // ✅ Changed from false
        hide: true,   // ✅ Changed from false
        reason: "Content hidden - moderation service unavailable"
      });
    }

    // ... Perspective API call ...

  } catch (err) {
    // ✅ CHANGE: Default to HIDE on error
    return NextResponse.json({
      error: "Moderation service unavailable",
      blur: true,   // ✅ Changed from false
      hide: true,   // ✅ Changed from false
      reason: "Content hidden - moderation error",
    });
  }
}
```

---

### Fix #3: Remove Hover-to-Reveal (5 min)

**File**: `app/FeedClient.tsx`

**Problem**: Blurred content becomes readable on hover.

**Solution**:
```typescript
// FIND THIS (around line 450):
{blurred ? (
  <p
    className="blur-sm hover:blur-none cursor-pointer transition text-sm leading-relaxed"
    title="Blurred for safety"
  >
    {post.body}
  </p>
) : (

// ✅ REPLACE WITH:
{blurred ? (
  <div className="relative">
    <p className="blur-sm text-sm leading-relaxed select-none">
      {post.body}
    </p>
    <p className="text-[10px] text-slate-500 mt-1">
      ⚠️ Content may be offensive
    </p>
  </div>
) : (
```

**Also fix comments** (around line 550):
```typescript
// FIND:
{c.is_blurred ? (
  <p className="blur-sm hover:blur-none cursor-pointer text-xs">
    {c.body}
  </p>
) : (

// ✅ REPLACE WITH:
{c.is_blurred ? (
  <p className="blur-sm text-xs select-none">
    {c.body}
  </p>
) : (
```

---

### Fix #4: Add is_hidden to Comments (45 min)

#### Step 4a: Database Migration (5 min)

**Run in Supabase SQL Editor**:
```sql
-- Add is_hidden column to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_comments_is_hidden ON comments(is_hidden);
```

#### Step 4b: Update Comment Type (2 min)

**File**: `types/Comment.ts`

```typescript
export type Comment = {
  id: string;
  post_id: string;
  body: string;
  author_hash: string;
  created_at: string;
  is_blurred: boolean;
  is_hidden: boolean;  // ✅ ADD THIS
};
```

#### Step 4c: Update CommentComposer (5 min)

**File**: `app/CommentComposer.tsx`

```typescript
// FIND (around line 30):
const is_blurred = moderation.blur ?? false;
const is_hidden = moderation.hide ?? false;

// Step 2: Create comment with moderation metadata
const response = await fetch("/api/comments/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    post_id: postId,
    body: text,
    author_hash: authorHash,
    is_blurred: is_blurred,
  }),
});

// ✅ CHANGE TO:
const is_blurred = moderation.blur ?? false;
const is_hidden = moderation.hide ?? false;

// Step 2: Create comment with moderation metadata
const response = await fetch("/api/comments/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    post_id: postId,
    body: text,
    author_hash: authorHash,
    is_blurred: is_blurred,
    is_hidden: is_hidden,  // ✅ ADD THIS
  }),
});
```

#### Step 4d: Update Comment API (5 min)

**File**: `app/api/comments/create/route.ts`

```typescript
// FIND (around line 35):
const { post_id, body, author_hash, is_blurred } = await req.json();

// ... later ...

const { data: createdComment, error: commentErr } = await supabase
  .from("comments")
  .insert({
    post_id,
    body,
    author_hash,
    is_blurred: Boolean(is_blurred),
  })

// ✅ CHANGE TO:
const { post_id, body, author_hash, is_blurred, is_hidden } = await req.json();

// ... later ...

const { data: createdComment, error: commentErr } = await supabase
  .from("comments")
  .insert({
    post_id,
    body,
    author_hash,
    is_blurred: Boolean(is_blurred),
    is_hidden: Boolean(is_hidden),  // ✅ ADD THIS
  })
```

#### Step 4e: Update FeedClient Display (5 min)

**File**: `app/FeedClient.tsx`

```typescript
// FIND (around line 550):
{comments[post.id].map((c) => (
  <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
    {c.is_blurred ? (
      <p className="blur-sm hover:blur-none cursor-pointer text-xs">
        {c.body}
      </p>
    ) : (
      <p className="text-xs text-slate-100">{c.body}</p>
    )}
    <p className="mt-1 text-[9px] text-slate-500">
      {timeAgo(c.created_at)}
    </p>
  </div>
))}

// ✅ REPLACE WITH:
{comments[post.id].map((c) => (
  <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
    {c.is_hidden ? (
      <p className="text-slate-500 italic text-xs">
        [Comment removed for safety]
      </p>
    ) : c.is_blurred ? (
      <p className="blur-sm text-xs select-none">
        {c.body}
      </p>
    ) : (
      <p className="text-xs text-slate-100">{c.body}</p>
    )}
    <p className="mt-1 text-[9px] text-slate-500">
      {timeAgo(c.created_at)}
    </p>
  </div>
))}
```

---

## High Priority Fixes (Do After Critical - 1 hour)

### Fix #5: Add Missing Moderation Categories (20 min)

**File**: `app/api/moderate/route.ts`

```typescript
// FIND:
requestedAttributes: {
  TOXICITY: {},
  INSULT: {},
  THREAT: {},
},

// ✅ REPLACE WITH:
requestedAttributes: {
  TOXICITY: {},
  SEVERE_TOXICITY: {},      // ✅ ADD
  INSULT: {},
  THREAT: {},
  IDENTITY_ATTACK: {},      // ✅ ADD
  PROFANITY: {},            // ✅ ADD
  SEXUALLY_EXPLICIT: {},    // ✅ ADD
},
```

```typescript
// FIND:
const toxicity = data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
const insult = data.attributeScores?.INSULT?.summaryScore?.value ?? 0;
const threat = data.attributeScores?.THREAT?.summaryScore?.value ?? 0;

const maxScore = Math.max(toxicity, insult, threat);

// ✅ REPLACE WITH:
const toxicity = data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
const severeToxicity = data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value ?? 0;
const insult = data.attributeScores?.INSULT?.summaryScore?.value ?? 0;
const threat = data.attributeScores?.THREAT?.summaryScore?.value ?? 0;
const identityAttack = data.attributeScores?.IDENTITY_ATTACK?.summaryScore?.value ?? 0;
const profanity = data.attributeScores?.PROFANITY?.summaryScore?.value ?? 0;
const sexuallyExplicit = data.attributeScores?.SEXUALLY_EXPLICIT?.summaryScore?.value ?? 0;

const maxScore = Math.max(
  toxicity,
  severeToxicity,
  insult,
  threat,
  identityAttack,
  profanity,
  sexuallyExplicit
);
```

---

### Fix #6: Lower Thresholds (5 min)

**File**: `app/api/moderate/route.ts`

```typescript
// FIND:
return NextResponse.json({
  blur: maxScore > 0.55,
  hide: maxScore > 0.85,
  reason: `Toxicity score: ${(maxScore * 100).toFixed(1)}%`,
});

// ✅ REPLACE WITH:
return NextResponse.json({
  blur: maxScore > 0.4,   // ✅ Lowered from 0.55
  hide: maxScore > 0.7,   // ✅ Lowered from 0.85
  reason: `Moderation score: ${(maxScore * 100).toFixed(1)}%`,
});
```

---

### Fix #7: Update lock_if_toxic to Count Hidden Comments (10 min)

**Run in Supabase SQL Editor**:

```sql
-- Update lock_if_toxic to count both blurred AND hidden comments
CREATE OR REPLACE FUNCTION lock_if_toxic(post_id UUID)
RETURNS VOID AS $
BEGIN
  -- Count toxic comments (blurred OR hidden)
  IF (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.post_id = lock_if_toxic.post_id 
    AND (is_blurred = TRUE OR is_hidden = TRUE)  -- ✅ Changed
  ) >= 3 THEN
    -- Lock the thread
    UPDATE posts 
    SET locked = TRUE 
    WHERE id = lock_if_toxic.post_id;
  END IF;
END;
$ LANGUAGE plpgsql;
```

---

## Testing After Fixes

### Test #1: Edit Bypass Fixed
```
1. Create post with "I hate you"
2. Verify it gets blurred/hidden
3. Edit to "I really hate you"
4. Verify it gets re-moderated (not reset to visible)
```

### Test #2: Failure Mode Fixed
```
1. Stop Perspective API (invalid key)
2. Try to create post
3. Verify post is hidden by default
```

### Test #3: Hover Removed
```
1. Create blurred post
2. Hover over it
3. Verify content stays blurred
```

### Test #4: Comments Can Be Hidden
```
1. Create comment with extreme toxicity
2. Verify it shows "[Comment removed for safety]"
3. Verify content is NOT in DOM
```

---

## Deployment Checklist

- [ ] Run database migration for comments.is_hidden
- [ ] Update all 7 files listed above
- [ ] Run TypeScript check: `npm run type-check`
- [ ] Test all 4 scenarios above
- [ ] Verify no console errors
- [ ] Test on mobile viewport
- [ ] Deploy to production

---

## Time Estimate

- **Critical Fixes**: 2 hours
- **High Priority Fixes**: 1 hour
- **Testing**: 30 minutes
- **Total**: 3.5 hours

---

## After Demo (Production Hardening)

1. Add auto-delete for extreme violations (>90% score)
2. Implement moderation logging table
3. Add user warnings before posting
4. Add admin moderation dashboard
5. Implement appeal system
6. Add rate limiting
7. Add IP-based blocking for repeat offenders

---

## Questions?

If you get stuck on any fix, check:
1. TypeScript errors: `npm run type-check`
2. Console errors: Browser DevTools
3. Database errors: Supabase Logs
4. API errors: Network tab in DevTools
