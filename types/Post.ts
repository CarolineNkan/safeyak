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

  // Comments (optional, loaded separately)
  comments?: Comment[];
};
