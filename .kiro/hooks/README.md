# Kiro Agent Hooks vs Runtime Application Hooks

## Important Distinction

The files in this directory (`.kiro/hooks/`) are **Kiro Agent Hooks** for IDE automation, NOT runtime application hooks.

## What Are Kiro Agent Hooks?

Kiro Agent Hooks trigger **agent executions in the IDE** based on events like:

- **File saves** - Run agent when you save a file
- **Agent completion** - Chain agent executions
- **User messages** - Auto-respond to certain messages
- **Session creation** - Run setup on first message

### Example Use Cases

- When you save a test file → automatically run tests
- When you update translation strings → update other languages
- When you click a button → run spell-check on README

### How to Create Kiro Agent Hooks

1. Open Command Palette (Ctrl/Cmd + Shift + P)
2. Search for "Open Kiro Hook UI"
3. Configure your hook with triggers and actions

Or view existing hooks in the Explorer → "Agent Hooks" section

## What Are Runtime Application Hooks?

Runtime hooks intercept **your application's function calls** while it's running. These are NOT what Kiro Agent Hooks do.

For SafeYak's moderation system, we use a **runtime API endpoint** instead:

```
User creates post → Frontend calls /api/moderate → OpenAI moderation → createPost()
```

## Files in This Directory

### `moderation.js`
- **Type**: Example/Reference only
- **Status**: NOT used at runtime
- **Purpose**: Shows what a Kiro Agent Hook looks like
- **Note**: Cannot intercept runtime function calls

### `on_new_post.yaml`
- **Type**: Declarative config example
- **Status**: NOT executed
- **Purpose**: Reference for what a declarative hook might look like

## Actual Moderation Implementation

The **real** moderation system is in:

- `app/api/moderate/route.ts` - API endpoint that calls OpenAI
- `app/FeedClient.tsx` - Calls moderation API before createPost
- `lib/posts.ts` - Accepts moderation metadata

See `MODERATION_SETUP.md` in the root directory for full documentation.

## Summary

| Feature | Kiro Agent Hooks | Runtime App Hooks |
|---------|------------------|-------------------|
| **Purpose** | IDE automation | Application logic |
| **Runs when** | IDE events (save, message, etc.) | Application runtime |
| **Location** | `.kiro/hooks/` | Your app code |
| **Example** | Auto-run tests on save | Moderate posts before creation |
| **SafeYak uses** | ❌ Not currently | ✅ `/api/moderate` endpoint |

## Learn More

- Kiro Agent Hooks: Open Command Palette → "Open Kiro Hook UI"
- Runtime moderation: See `MODERATION_SETUP.md`
