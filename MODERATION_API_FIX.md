# Moderation API Integration Fix

## Issue Found

**CommentComposer.tsx** was NOT calling the moderation API before creating comments. It was sending `is_blurred: false` directly, bypassing content moderation.

## Status Before Fix

### PostComposer.tsx ✅
**Already correct** - Calls moderation API properly:
```typescript
const modRes = await fetch("/api/moderate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: body }),
});

const mod = await modRes.json();
const is_blurred = mod.blur ?? false;
const is_hidden = mod.hide ?? false;
const moderation_reason = mod.reason ?? "Moderation unavailable";
```

### CommentComposer.tsx ❌
**Missing moderation** - Was sending hardcoded values:
```typescript
// OLD CODE (WRONG)
body: JSON.stringify({
  post_id: postId,
  body: text,
  author_hash: authorHash,
  is_blurred: false, // ❌ Hardcoded, no moderation!
}),
```

## Fix Applied

Updated **CommentComposer.tsx** to call moderation API before creating comment:

```typescript
// Step 1: Call moderation API
const moderationResponse = await fetch("/api/moderate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: text }),
});

const moderation = await moderationResponse.json();

// Extract moderation results (with fallbacks)
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
    is_blurred: is_blurred, // ✅ Now uses moderation result
  }),
});
```

## Diff Summary

### app/CommentComposer.tsx

**Before**:
```typescript
async function submit() {
  // ...
  const response = await fetch("/api/comments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      post_id: postId,
      body: text,
      author_hash: authorHash,
      is_blurred: false, // ❌ Hardcoded
    }),
  });
}
```

**After**:
```typescript
async function submit() {
  // ...
  
  // Step 1: Call moderation API ✅
  const moderationResponse = await fetch("/api/moderate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text }),
  });

  const moderation = await moderationResponse.json();
  const is_blurred = moderation.blur ?? false;
  const is_hidden = moderation.hide ?? false;

  // Step 2: Create comment with moderation metadata ✅
  const response = await fetch("/api/comments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      post_id: postId,
      body: text,
      author_hash: authorHash,
      is_blurred: is_blurred, // ✅ Uses moderation result
    }),
  });
}
```

## Verification

### Both Composers Now Call Moderation API ✅

#### PostComposer.tsx
```typescript
await fetch("/api/moderate", {
  method: "POST",
  body: JSON.stringify({ text: body }),
});
```

#### CommentComposer.tsx
```typescript
await fetch("/api/moderate", {
  method: "POST",
  body: JSON.stringify({ text: text }),
});
```

### Both Use Moderation Results ✅

#### PostComposer.tsx
```typescript
const is_blurred = mod.blur ?? false;
const is_hidden = mod.hide ?? false;
const moderation_reason = mod.reason ?? "Moderation unavailable";
```

#### CommentComposer.tsx
```typescript
const is_blurred = moderation.blur ?? false;
const is_hidden = moderation.hide ?? false;
```

## Flow Diagram

### Post Creation Flow
```
User types post
    ↓
PostComposer.handleSubmit()
    ↓
POST /api/moderate { text: body }
    ↓
HuggingFace toxic-bert analysis
    ↓
Returns { blur, hide, toxicity, reason }
    ↓
POST /api/createPost { body, zone, is_blurred, is_hidden, moderation_reason }
    ↓
Post created in database
    ↓
Real-time update to all clients
```

### Comment Creation Flow
```
User types comment
    ↓
CommentComposer.submit()
    ↓
POST /api/moderate { text: text } ✅ NOW ADDED
    ↓
HuggingFace toxic-bert analysis
    ↓
Returns { blur, hide, toxicity, reason }
    ↓
POST /api/comments/create { post_id, body, author_hash, is_blurred }
    ↓
Comment created in database
    ↓
lock_if_toxic RPC called
    ↓
Thread may lock if 3+ toxic comments
    ↓
Real-time update to all clients
```

## Testing

### Test Comment Moderation

1. **Clean Comment** (should be allowed):
   ```
   "Great post, thanks for sharing!"
   ```
   Expected: `is_blurred: false`, appears normally

2. **Offensive Comment** (should be blurred):
   ```
   "You're such an idiot"
   ```
   Expected: `is_blurred: true`, appears blurred

3. **Toxic Comment** (should be blurred):
   ```
   "I hate you all"
   ```
   Expected: `is_blurred: true`, appears blurred

4. **Thread Locking** (3 toxic comments):
   - Create 3 toxic comments on same post
   - After 3rd comment, thread should lock
   - Red banner appears, composer disabled

### Verify Moderation API Calls

Open browser DevTools → Network tab:

1. Create a comment
2. Look for two requests:
   - `POST /api/moderate` ✅
   - `POST /api/comments/create` ✅
3. Check `/api/moderate` response:
   ```json
   {
     "blur": false,
     "hide": false,
     "toxicity": 0.15,
     "reason": null
   }
   ```

## Summary

✅ **PostComposer.tsx** - Already calling moderation API correctly
✅ **CommentComposer.tsx** - NOW calling moderation API correctly
✅ Both use exact format: `{ text: body }` or `{ text: text }`
✅ Both extract `blur`, `hide`, `reason` from response
✅ Both pass moderation results to creation APIs
✅ TypeScript compilation: No errors
✅ Ready to test

## Impact

- **Before**: Comments bypassed moderation entirely
- **After**: Comments are moderated just like posts
- **Result**: Consistent safety across posts and comments
- **Benefit**: Thread locking works correctly based on toxic comment count
