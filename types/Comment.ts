export type Comment = {
  id: string;
  post_id: string;
  body: string;
  author_hash: string;
  created_at: string;
  is_blurred: boolean;
  is_hidden: boolean;
};
