# Simple Moderation Test

## Step 1: Verify Database Schema

Run in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'posts';
```

You MUST see:
- `is_blurred` (boolean)
- `moderation_reason` (text)

If not, run:

```sql
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_blurred BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
```

## Step 2: Test Moderation API

Open browser console on http://localhost:3000 and run:

```javascript
// Test 1: Clean content (should allow)
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({body: 'Anyone want to study for the exam?'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: false, hide: false, reason: "..."}

// Test 2: Doxxing (should hide)
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({body: 'John Smith in room 204 is so annoying'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: false, hide: true, reason: "Contains personal identifying information"}

// Test 3: Harassment (should blur)
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({body: 'You are such a loser, everyone hates you'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: true, hide: false, reason: "Harassment or bullying detected"}
```

## Step 3: Test Full Flow

1. Go to http://localhost:3000
2. Create a post with: "Anyone want to grab coffee?"
   - Should appear normally
3. Create a post with: "Email me at john@example.com"
   - Should be HIDDEN (not appear in feed)
4. Create a post with: "You're all idiots"
   - Should appear BLURRED (hover to reveal)

## Debugging

If posts aren't being moderated:

1. Check browser console for errors
2. Check terminal for API errors
3. Verify OPENAI_API_KEY is set in .env.local
4. Verify database has is_blurred and moderation_reason columns
5. Check Supabase logs for insert errors

## Common Issues

### Issue: Posts appear without blur/hide

**Cause**: Database columns don't exist

**Fix**: Run the ALTER TABLE migration

### Issue: "Moderation failed" in console

**Cause**: OpenAI API key missing or invalid

**Fix**: Add valid OPENAI_API_KEY to .env.local and restart dev server

### Issue: Duplicate posts

**Cause**: Real-time subscription adding posts twice

**Fix**: Already fixed in FeedClient.tsx with duplicate check

### Issue: Posts not appearing at all

**Cause**: Hidden posts are filtered from getRecentPosts

**Fix**: This is correct behavior - hidden posts shouldn't appear
