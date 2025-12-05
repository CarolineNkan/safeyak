/**
 * NOTE: This is a Kiro Agent Hook for IDE automation, NOT a runtime application hook.
 * 
 * Kiro Agent Hooks trigger agent executions based on IDE events like:
 * - File saves
 * - Agent execution completion
 * - User messages
 * 
 * For RUNTIME moderation (checking posts before creation), see:
 * - app/api/moderate/route.ts (the actual moderation API)
 * - app/PostComposer.tsx (calls the moderation API before createPost)
 * 
 * This file is kept for reference but is not used in the application runtime.
 */

export default {
  event: "before-call",
  filter: {
    functionName: "createPost",
  },
  async run(ctx) {
    // This would only work if Kiro hooks could intercept runtime function calls
    // which they cannot - they're for IDE automation only
    const body = ctx.args[1];

    const moderation = await ctx.mcp.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are SafeYak's moderation engine.
Analyze the content of a post and classify it with these fields:

allowed: true/false
blur: true/false
hide: true/false
reason: string describing why
flags: ["harassment" | "doxxing" | "profanity" | "sensitive" | "illegal" | ...]

Rules:
- Doxxing → hide
- Threats → hide
- Harassment → blur
- Sexual content → blur
- Rumors → blur
- Mild profanity → allowed
- Personal info (emails, dorm rooms) → blur or hide
          `,
        },
        { role: "user", content: body },
      ],
    });

    const result = JSON.parse(moderation.choices[0].message.content);

    ctx.args.push(result); // pass moderation result to backend

    return ctx;
  },
};
