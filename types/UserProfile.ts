export type UserProfile = {
  author_hash: string;
  reputation: number;
  post_count: number;
  comment_count: number;
  upvotes_received: number;
  bookmarks_received: number;
  joined_at: string;
};

export type ProfileStats = {
  reputation: number;
  post_count: number;
  comment_count: number;
  upvotes_received: number;
  bookmarks_received: number;
  joined_at: string;
};
