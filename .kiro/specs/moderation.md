# SafeYak Moderation Spec

## Overview
SafeYak is an anonymous social feed inspired by the resurrection of Yik Yak, rebuilt with a safety-first design. 
Moderation must protect users from bullying, harassment, hate speech, sexual content, and harmful behavior while 
preserving anonymity and campus culture.

Moderation happens automatically through Kiro Agent Hooks whenever a new post is created.

---

## Core Moderation Goals
1. Protect students from emotional harm and bullying.
2. Prevent doxxing or revealing personal identities.
3. Enforce TikTok-style safety standards adapted for anonymous communities.
4. Reduce harmful viral content (dangerous challenges, harassment).
5. Automatically escalate repeat offenders using strike & shadow-ban logic.

---

## Rules for Allowed Content
Users MAY post content that:
- Shares campus experiences.
- Asks questions or gives advice.
- Makes jokes that are not targeted at individuals or groups.
- Discusses emotions or stress without explicit self-harm.

---

## Rules for Disallowed Content

### 1. Bullying & Harassment
Disallowed:
- Direct insults (“you’re ugly”, “kill yourself”, “you’re worthless”)
- Targeting individuals or identifiable students
- Encouraging harassment toward a person

Action:
- Immediately hide post
- Add strike to author_hash

---

### 2. Hate Speech
Disallowed:
- Slurs
- Attacks against protected categories (race, gender, religion, sexuality, disability)

Action:
- Hide post
- Mark reason: “Hate Speech”
- Strike author_hash

---

### 3. Sexual Content & Exploitation
Disallowed:
- Sexual threats
- Graphic descriptions
- Content involving minors
- Sharing explicit content

Action:
- Hide + escalate severity

---

### 4. Self-Harm / Danger
Disallowed:
- Encouraging harm
- Harm instructions
- Severe emotional breakdowns requiring support

Action:
- Blur post
- Add warning label: “Sensitive mental health content”
- Do NOT strike

---

### 5. Doxxing & Identity Exposure
Disallowed:
- Names of fellow students
- Posting pictures of students
- Any identifiable info

Action:
- Auto-hide
- Hard strike

---

## Response Levels

### Level 1: Allow (clean content)
Post appears normally.

### Level 2: Blur (sensitive content)
- Blur content
- Add warning overlay
- Requires tap to reveal

### Level 3: Hide (strong violation)
- Remove from public feed
- Log reason
- Count strike

### Level 4: Shadow Ban (repeat offenders)
If author_hash ≥ 3 strikes:
- Allow posting but hide every post from others
- Author sees posts normally (illusion of participation)

---

## Strike Rules
Strikes automatically assigned for:
- Hate speech (2 strikes)
- Harassment (1 strike)
- Sexual content (1–3 depending severity)
- Doxxing (3 strikes)

Shadow-ban threshold:
≥ 3 strikes

yaml
Copy code

---

## Output Required for Moderation Hook
When moderating a post, return:

{
action: "allow" | "blur" | "hide",
reason: "string",
strike: number
}

yaml
Copy code

The hook will update the post record accordingly.

---

## Database Fields Used in Moderation
- `is_hidden` → true = removed from feed
- `is_blurred` → true = blur overlay in UI
- `reason` → moderation message
- `author_hash` → identity fingerprint
- `strike_count` → number of strikes on user

---

## End of Spec
This spec powers SafeYak’s full moderation engine using Kiro.