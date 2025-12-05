import { Comment } from "./Comment";

export type Post = {
  id: string;
  body: string;
  zone: string;

  author_hash: string;
  created_at: string;

  // Moderation
  is_blurred: boolean;
  is_hidden: boolean;
  moderation_reason: string | null;

  // Auto-lock system
  locked: boolean;

  // Voting and engagement
  score?: number;
  upvotes?: number;
  downvotes?: number;
  bookmarks_count?: number;
  comment_count?: number;

  // Reputation (for author)
  reputation?: number;

  // Comments (optional, loaded separately)
  comments?: Comment[];

  // Edit/Delete permissions (client-side only)
  can_edit?: boolean;
  can_delete?: boolean;
};
