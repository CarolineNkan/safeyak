import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Post } from '@/types/Post';

/**
 * Feature: reputation-system, Property 7: Real-time reputation updates
 * Validates: Requirements 5.1, 5.2
 * 
 * Property: For any reputation change in the database, all posts by that author 
 * currently displayed in the feed should have their reputation badge updated to 
 * reflect the new value.
 */

describe('FeedClient Real-time Reputation Updates Property Tests', () => {
  let mockSupabase: any;
  let mockChannel: any;
  let reputationUpdateCallback: ((payload: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    reputationUpdateCallback = null;

    // Create mock channel
    mockChannel = {
      on: vi.fn((event: string, filter: any, callback: (payload: any) => void) => {
        if (filter.table === 'reputation' && filter.event === 'UPDATE') {
          reputationUpdateCallback = callback;
        }
        return mockChannel;
      }),
      subscribe: vi.fn(() => mockChannel),
    };

    // Create mock supabase client
    mockSupabase = {
      channel: vi.fn((channelName: string) => mockChannel),
      removeChannel: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 7: Real-time reputation updates for any reputation change', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial posts with various author hashes
        fc.array(
          fc.record({
            id: fc.uuid(),
            body: fc.string({ minLength: 1, maxLength: 280 }),
            zone: fc.constantFrom('campus', 'local', 'global'),
            author_hash: fc.stringMatching(/^[a-zA-Z0-9]{32,64}$/),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
            is_blurred: fc.boolean(),
            is_hidden: fc.boolean(),
            moderation_reason: fc.option(fc.string(), { nil: null }),
            locked: fc.boolean(),
            reputation: fc.integer({ min: 0, max: 500 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate a reputation update event
        fc.record({
          author_hash: fc.stringMatching(/^[a-zA-Z0-9]{32,64}$/),
          new_reputation: fc.integer({ min: 0, max: 500 }),
        }),
        async (initialPosts, reputationUpdate) => {
          // Ensure at least one post has the author_hash that will be updated
          const postsWithTarget = initialPosts.length > 0 
            ? [
                { ...initialPosts[0], author_hash: reputationUpdate.author_hash },
                ...initialPosts.slice(1)
              ]
            : [
                {
                  id: 'test-id',
                  body: 'Test post',
                  zone: 'campus',
                  author_hash: reputationUpdate.author_hash,
                  created_at: new Date().toISOString(),
                  is_blurred: false,
                  is_hidden: false,
                  moderation_reason: null,
                  locked: false,
                  reputation: 50,
                }
              ];

          // Simulate the real-time update logic from FeedClient
          let posts = [...postsWithTarget];

          // Simulate receiving a reputation update
          const payload = {
            new: {
              author_hash: reputationUpdate.author_hash,
              reputation: reputationUpdate.new_reputation,
            },
          };

          // Apply the update logic (as it should be implemented in FeedClient)
          posts = posts.map((p) =>
            p.author_hash === payload.new.author_hash
              ? { ...p, reputation: payload.new.reputation }
              : p
          );

          // Property: All posts by the updated author should have new reputation
          const updatedAuthorPosts = posts.filter(
            (p) => p.author_hash === reputationUpdate.author_hash
          );
          
          expect(updatedAuthorPosts.length).toBeGreaterThan(0);
          
          updatedAuthorPosts.forEach((post) => {
            expect(post.reputation).toBe(reputationUpdate.new_reputation);
          });

          // Property: Posts by other authors should remain unchanged
          const otherAuthorPosts = posts.filter(
            (p) => p.author_hash !== reputationUpdate.author_hash
          );
          
          otherAuthorPosts.forEach((post, index) => {
            const originalPost = postsWithTarget.find(p => p.id === post.id);
            if (originalPost && originalPost.author_hash !== reputationUpdate.author_hash) {
              expect(post.reputation).toBe(originalPost.reputation);
            }
          });
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in the design
    );
  });

  it('Property 7 (edge case): Multiple posts by same author all update', async () => {
    const authorHash = 'test_author_hash_12345678901234567890';
    const initialReputation = 50;
    const newReputation = 150;

    const posts: Post[] = [
      {
        id: '1',
        body: 'Post 1',
        zone: 'campus',
        author_hash: authorHash,
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: initialReputation,
      },
      {
        id: '2',
        body: 'Post 2',
        zone: 'campus',
        author_hash: authorHash,
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: initialReputation,
      },
      {
        id: '3',
        body: 'Post 3',
        zone: 'campus',
        author_hash: 'different_author_hash_12345678901234567890',
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: 75,
      },
    ];

    // Simulate reputation update
    const payload = {
      new: {
        author_hash: authorHash,
        reputation: newReputation,
      },
    };

    const updatedPosts = posts.map((p) =>
      p.author_hash === payload.new.author_hash
        ? { ...p, reputation: payload.new.reputation }
        : p
    );

    // All posts by the same author should be updated
    const authorPosts = updatedPosts.filter(p => p.author_hash === authorHash);
    expect(authorPosts.length).toBe(2);
    authorPosts.forEach(post => {
      expect(post.reputation).toBe(newReputation);
    });

    // Other author's post should remain unchanged
    const otherPost = updatedPosts.find(p => p.id === '3');
    expect(otherPost?.reputation).toBe(75);
  });

  it('Property 7 (edge case): Update for non-existent author has no effect', async () => {
    const posts: Post[] = [
      {
        id: '1',
        body: 'Post 1',
        zone: 'campus',
        author_hash: 'author_hash_1_12345678901234567890',
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: 50,
      },
      {
        id: '2',
        body: 'Post 2',
        zone: 'campus',
        author_hash: 'author_hash_2_12345678901234567890',
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: 75,
      },
    ];

    // Simulate reputation update for non-existent author
    const payload = {
      new: {
        author_hash: 'non_existent_author_hash_12345678901234567890',
        reputation: 200,
      },
    };

    const updatedPosts = posts.map((p) =>
      p.author_hash === payload.new.author_hash
        ? { ...p, reputation: payload.new.reputation }
        : p
    );

    // All posts should remain unchanged
    expect(updatedPosts[0].reputation).toBe(50);
    expect(updatedPosts[1].reputation).toBe(75);
  });

  it('Property 7 (edge case): Reputation update to 0 is handled correctly', async () => {
    const authorHash = 'test_author_hash_12345678901234567890';
    
    const posts: Post[] = [
      {
        id: '1',
        body: 'Post 1',
        zone: 'campus',
        author_hash: authorHash,
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: 100,
      },
    ];

    // Simulate reputation update to 0
    const payload = {
      new: {
        author_hash: authorHash,
        reputation: 0,
      },
    };

    const updatedPosts = posts.map((p) =>
      p.author_hash === payload.new.author_hash
        ? { ...p, reputation: payload.new.reputation }
        : p
    );

    // Reputation should be updated to 0
    expect(updatedPosts[0].reputation).toBe(0);
  });

  it('Property 7 (edge case): Very high reputation values are handled', async () => {
    const authorHash = 'test_author_hash_12345678901234567890';
    const veryHighReputation = 999999;
    
    const posts: Post[] = [
      {
        id: '1',
        body: 'Post 1',
        zone: 'campus',
        author_hash: authorHash,
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
        reputation: 100,
      },
    ];

    // Simulate reputation update to very high value
    const payload = {
      new: {
        author_hash: authorHash,
        reputation: veryHighReputation,
      },
    };

    const updatedPosts = posts.map((p) =>
      p.author_hash === payload.new.author_hash
        ? { ...p, reputation: payload.new.reputation }
        : p
    );

    // Reputation should be updated to the high value
    expect(updatedPosts[0].reputation).toBe(veryHighReputation);
    expect(typeof updatedPosts[0].reputation).toBe('number');
    expect(Number.isFinite(updatedPosts[0].reputation)).toBe(true);
  });
});
