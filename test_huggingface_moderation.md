# HuggingFace Moderation Testing Guide

## Overview

SafeYak now uses HuggingFace's `unitary/toxic-bert` model for content moderation instead of OpenAI.

## Moderation Rules

- **toxicity > 0.90** → `hide: true` (Severe toxicity - post won't appear)
- **toxicity > 0.60** → `blur: true` (Offensive content - blurred, hover to reveal)
- **toxicity ≤ 0.60** → Allowed (Normal display)

## Step 1: Verify API Key

Check `.env.local` has:

```bash
HUGGINGFACE_API_KEY=hf_...
```

Get your key from: https://huggingface.co/settings/tokens

## Step 2: Test Moderation API

Open browser console on http://localhost:3000 and run:

### Test 1: Clean Content (Should Allow)

```javascript
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'Anyone want to study for the exam?'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: false, hide: false, toxicity: 0.01-0.20, reason: null}
```

### Test 2: Mild Profanity (Should Allow or Blur)

```javascript
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'This exam was damn hard'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: false, hide: false, toxicity: 0.30-0.50, reason: null}
```

### Test 3: Offensive Content (Should Blur)

```javascript
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'You are such a loser, everyone hates you'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: true, hide: false, toxicity: 0.60-0.85, reason: "Offensive content detected"}
```

### Test 4: Severe Toxicity (Should Hide)

```javascript
fetch('/api/moderate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({text: 'I will kill you, you worthless piece of trash'})
}).then(r => r.json()).then(console.log);

// Expected: {blur: false, hide: true, toxicity: 0.90-0.99, reason: "Severe toxicity detected"}
```

## Step 3: Test Full Flow in UI

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000

### Test Cases:

**Clean Post:**
- Type: "Anyone want to grab coffee?"
- Expected: Appears normally

**Offensive Post:**
- Type: "You're all idiots and losers"
- Expected: Appears BLURRED with yellow warning, hover to reveal

**Severe Post:**
- Type: "I hate you all, you should die"
- Expected: Does NOT appear in feed (hidden)

## Step 4: Check Database

After creating posts, check Supabase:

```sql
SELECT 
  body, 
  is_hidden, 
  is_blurred, 
  moderation_reason,
  created_at
FROM posts
ORDER BY created_at DESC
LIMIT 10;
```

You should see:
- Clean posts: `is_hidden=false, is_blurred=false, moderation_reason=null`
- Offensive posts: `is_hidden=false, is_blurred=true, moderation_reason='Offensive content detected'`
- Severe posts: `is_hidden=true, is_blurred=false, moderation_reason='Severe toxicity detected'`

## Debugging

### Issue: "Moderation service unavailable"

**Cause**: HuggingFace API key missing or invalid

**Fix**: 
1. Check `.env.local` has `HUGGINGFACE_API_KEY`
2. Verify key is valid at https://huggingface.co/settings/tokens
3. Restart dev server after adding key

### Issue: All posts are allowed (no moderation)

**Cause**: API returning low toxicity scores

**Fix**: 
1. Check browser console for API errors
2. Test API directly (see Step 2)
3. HuggingFace model might be loading (first request can take 20-30 seconds)

### Issue: Posts not appearing at all

**Cause**: Hidden posts are filtered from feed

**Fix**: This is correct behavior - check database to confirm posts exist with `is_hidden=true`

## Model Information

- **Model**: `unitary/toxic-bert`
- **Type**: Text classification (toxicity detection)
- **Output**: Array of labels with confidence scores
- **Labels**: toxic, severe_toxic, obscene, threat, insult, identity_hate
- **Response Time**: 1-3 seconds (first request may take longer as model loads)

## Advantages of HuggingFace vs OpenAI

✅ **Free tier available** (1000 requests/month)
✅ **Specialized model** for toxicity detection
✅ **Consistent scoring** (0-1 scale)
✅ **No prompt engineering** needed
✅ **Faster response** (no LLM generation)

## API Response Format

```json
{
  "blur": false,
  "hide": false,
  "toxicity": 0.15,
  "reason": null
}
```

or

```json
{
  "blur": true,
  "hide": false,
  "toxicity": 0.72,
  "reason": "Offensive content detected"
}
```
