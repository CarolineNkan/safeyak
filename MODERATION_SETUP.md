# SafeYak Moderation System

## Overview

SafeYak uses OpenAI's GPT-4o-mini to moderate posts before they're created. The moderation system runs at **runtime** (when users create posts), not at build time.

## Architecture

```
User submits post
    ↓
PostComposer.tsx
    ↓
FeedClient.handlePostCreated()
    ↓
POST /api/moderate (OpenAI moderation)
    ↓
createPost(zone, body, moderation)
    ↓
Supabase (with is_hidden, is_blurred, moderation_reason)
    ↓
Real-time update to all clients
```

## Files

### Runtime Moderation (Active)

- **`app/api/moderate/route.ts`** - API endpoint that calls OpenAI for moderation
- **`app/FeedClient.tsx`** - Calls moderation API before createPost
- **`lib/posts.ts`** - createPost accepts moderation metadata

### Reference Only (Not Used at Runtime)

- **`.kiro/hooks/moderation.js`** - Example of what a Kiro Agent Hook looks like (for IDE automation, not runtime)
- **`.kiro/hooks/on_new_post.yaml`** - Declarative config example (not executed)

## Moderation Rules

The moderation API (`/api/moderate`) returns:

```json
{
  "blur": boolean,
  "hide": boolean,
  "reason": string
}
```

### Logic Rules

- **Doxxing** (names, addresses, room numbers, emails) → `hide: true`
- **Personal identifying information** → `hide: true`
- **Harassment or bullying** → `blur: true`
- **Severe profanity or slurs** → `blur: true`
- **Mild profanity** → allowed (`blur: false, hide: false`)
- **Rumors or unverified claims** → `blur: true`
- **NSFW or sexual content** → `blur: true`
- **Illegal activity or threats** → `hide: true`

## Setup

1. Add OpenAI API key to `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

2. Install OpenAI SDK (already in package.json):

```bash
npm install openai
```

3. Update Supabase posts table to include moderation fields:

```sql
ALTER TABLE posts 
ADD COLUMN is_blurred BOOLEAN DEFAULT FALSE,
ADD COLUMN moderation_reason TEXT;
```

## Testing

Test the moderation endpoint:

```bash
curl -X POST http://localhost:3000/api/moderate \
  -H "Content-Type: application/json" \
  -d '{"body": "Hey everyone in Dorm 3, room 204!"}'
```

Expected response:

```json
{
  "blur": false,
  "hide": true,
  "reason": "Contains personal identifying information (room number)"
}
```

## UI Behavior

- **Hidden posts** (`is_hidden: true`) - Not displayed in feed
- **Blurred posts** (`is_blurred: true`) - Displayed with blur effect, hover to reveal
- **Moderation reason** - Shown as yellow warning text above post

## Notes

- Moderation happens **before** the post is inserted into the database
- The moderation metadata is stored with the post for transparency
- Real-time updates work normally - all clients see the moderation state
- This is a **synchronous** flow - users wait for moderation before post appears
