# SafeYak Moderation Setup Checklist

## ✅ Completed

- [x] Created `/api/moderate` endpoint using OpenAI GPT-4o-mini
- [x] Updated `FeedClient.tsx` to call moderation before creating posts
- [x] Updated `lib/posts.ts` to accept moderation metadata
- [x] Added `openai` package to dependencies
- [x] Installed npm packages
- [x] Created SQL migration for moderation fields
- [x] Added OPENAI_API_KEY to .env.local (placeholder)
- [x] Created test script for moderation API
- [x] Created documentation (MODERATION_SETUP.md)

## 🔧 Next Steps (You Need To Do)

### 1. Add Your HuggingFace API Key

Edit `.env.local` and replace the placeholder:

```bash
HUGGINGFACE_API_KEY=hf_your-actual-key-here
```

Get your key from: https://huggingface.co/settings/tokens

**Note**: We switched from OpenAI to HuggingFace's toxic-bert model for better toxicity detection.

### 2. Run Database Migration (CRITICAL!)

Open Supabase SQL Editor and run:

```sql
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_blurred BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
```

Or run the file: `supabase_add_moderation_fields.sql`

**To verify your schema is correct, run:** `verify_schema.sql`

⚠️ **Without these columns, moderation won't work!**

### 3. Test the Moderation API

Start your dev server:

```bash
npm run dev
```

Then test the moderation endpoint:

```bash
# On Mac/Linux:
chmod +x test_moderation.sh
./test_moderation.sh

# On Windows (PowerShell):
# Test manually with curl or use the examples in MODERATION_SETUP.md
```

### 4. Test in the UI

1. Go to http://localhost:3000
2. Try creating posts with different content:
   - "Anyone want to study?" (should be allowed)
   - "John Smith in room 204" (should be hidden)
   - "You're such a loser" (should be blurred)

## How It Works

```
User types post → PostComposer → FeedClient.handlePostCreated()
                                      ↓
                              POST /api/moderate (OpenAI)
                                      ↓
                              Returns {blur, hide, reason}
                                      ↓
                              createPost(zone, body, moderation)
                                      ↓
                              Supabase insert with moderation fields
                                      ↓
                              Real-time update to all clients
```

## Moderation Rules

- **Doxxing** → hide
- **Personal info** (emails, addresses, room numbers) → hide
- **Harassment** → blur
- **Severe profanity** → blur
- **Mild profanity** → allowed
- **Rumors** → blur
- **NSFW** → blur
- **Illegal activity** → hide

## Files Changed

- ✅ `app/api/moderate/route.ts` - NEW: Moderation API endpoint
- ✅ `app/FeedClient.tsx` - UPDATED: Calls moderation before createPost
- ✅ `lib/posts.ts` - UPDATED: Accepts moderation parameter
- ✅ `package.json` - UPDATED: Added openai dependency
- ✅ `.env.local` - UPDATED: Added OPENAI_API_KEY placeholder
- ✅ `supabase_add_moderation_fields.sql` - NEW: Database migration
- ✅ `test_moderation.sh` - NEW: Test script
- ✅ `MODERATION_SETUP.md` - NEW: Documentation

## Important Notes

- This is **runtime moderation** - happens when users create posts
- The `.kiro/hooks/moderation.js` file is NOT used at runtime (it's for Kiro IDE automation only)
- Moderation is **synchronous** - users wait for OpenAI response before post appears
- All moderation metadata is stored in the database for transparency
