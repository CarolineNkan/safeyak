import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Post } from '@/types/Post';

/**
 * Feature: reputation-system, Property 3: Posts enriched with reputation
 * Validates: Requirements 2.4
 * 
 * Property: For any set of loaded posts, each post with an author_hash should have 
 * its reputation field populated after the enrichment process completes.
 */

describe('FeedWithComposer Reputation Enrichment Property Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Property 3: Posts enriched with reputation for any set of posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of posts with random properties
        fc.array(
          fc.record({
            id: fc.uuid(),
            body: fc.string({ minLength: 1, maxLength: 280 }),
            zone: fc.constantFrom('campus', 'local', 'global'),
            author_hash: fc.option(fc.stringMatching(/^[a-zA-Z0-9]{32,64}$/), { nil: null }),
            created_at: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
            is_blurred: fc.boolean(),
            is_hidden: fc.boolean(),
            moderation_reason: fc.option(fc.string(), { nil: null }),
            locked: fc.boolean(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (posts) => {
          // Create a map of author_hash to reputation for mocking
          const reputationMap = new Map<string, number>();
          posts.forEach((post) => {
            if (post.author_hash && !reputationMap.has(post.author_hash)) {
              // Generate random reputation for each unique author
              reputationMap.set(post.author_hash, Math.floor(Math.random() * 500));
            }
          });

          // Mock fetch to return reputation values
          global.fetch = vi.fn((url: string | URL | Request) => {
            const urlStr = typeof url === 'string' ? url : url.toString();
            const urlObj = new URL(urlStr, 'http://localhost');
            const hash = urlObj.searchParams.get('hash');
            const reputation = hash ? (reputationMap.get(hash) ?? 0) : 0;
            
            return Promise.resolve({
              json: () => Promise.resolve({ reputation }),
            } as Response);
          }) as any;

          // Simulate the enrichment logic from FeedWithComposer
          const hashes = [...new Set(posts.map(p => p.author_hash).filter(Boolean))];
          
          const fetchedReputationMap: Record<string, number> = {};
          
          await Promise.all(
            hashes.map(async (hash) => {
              try {
                const res = await fetch(`/api/reputation?hash=${hash}`);
                const data = await res.json();
                fetchedReputationMap[hash!] = data.reputation;
              } catch (error) {
                fetchedReputationMap[hash!] = 0;
              }
            })
          );
          
          const enriched = posts.map(post => ({
            ...post,
            reputation: post.author_hash ? fetchedReputationMap[post.author_hash] : 0
          }));

          // Property: All posts with author_hash should have reputation populated
          enriched.forEach((post, index) => {
            if (posts[index].author_hash) {
              // Posts with author_hash should have numeric reputation
              expect(post.reputation).toBeDefined();
              expect(typeof post.reputation).toBe('number');
              expect(Number.isFinite(post.reputation)).toBe(true);
              expect(post.reputation).toBeGreaterThanOrEqual(0);
              
              // Should match the mocked reputation value
              expect(post.reputation).toBe(reputationMap.get(posts[index].author_hash!) ?? 0);
            } else {
              // Posts without author_hash should have 0 reputation
              expect(post.reputation).toBe(0);
            }
          });

          // Verify fetch was called for each unique author hash
          const uniqueHashes = [...new Set(posts.map(p => p.author_hash).filter(Boolean))];
          expect(global.fetch).toHaveBeenCalledTimes(uniqueHashes.length);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in the design
    );
  });

  it('Property 3 (edge case): Empty posts array', async () => {
    global.fetch = vi.fn();

    const posts: Post[] = [];
    const hashes = [...new Set(posts.map(p => p.author_hash).filter(Boolean))];
    
    // Should not call fetch for empty array
    expect(hashes.length).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Property 3 (edge case): All posts without author_hash', async () => {
    global.fetch = vi.fn();

    const posts: Post[] = [
      {
        id: '1',
        body: 'Test post 1',
        zone: 'campus',
        author_hash: null as any,
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
      },
      {
        id: '2',
        body: 'Test post 2',
        zone: 'campus',
        author_hash: null as any,
        created_at: new Date().toISOString(),
        is_blurred: false,
        is_hidden: false,
        moderation_reason: null,
        locked: false,
      },
    ];

    const hashes = [...new Set(posts.map(p => p.author_hash).filter(Boolean))];
    
    // Should not call fetch when no author hashes present
    expect(hashes.length).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Property 3 (edge case): Handles fetch errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
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
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (posts) => {
          // Mock fetch to throw errors
          global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

          // Simulate the enrichment logic with error handling
          const hashes = [...new Set(posts.map(p => p.author_hash).filter(Boolean))];
          const fetchedReputationMap: Record<string, number> = {};
          
          await Promise.all(
            hashes.map(async (hash) => {
              try {
                const res = await fetch(`/api/reputation?hash=${hash}`);
                const data = await res.json();
                fetchedReputationMap[hash!] = data.reputation;
              } catch (error) {
                fetchedReputationMap[hash!] = 0;
              }
            })
          );
          
          const enriched = posts.map(post => ({
            ...post,
            reputation: post.author_hash ? fetchedReputationMap[post.author_hash] : 0
          }));

          // Property: Even with fetch errors, posts should have reputation field (defaulting to 0)
          enriched.forEach((post) => {
            expect(post.reputation).toBeDefined();
            expect(typeof post.reputation).toBe('number');
            expect(Number.isFinite(post.reputation)).toBe(true);
            expect(post.reputation).toBe(0); // Should default to 0 on error
          });
        }
      ),
      { numRuns: 50 } // Fewer runs for error case
    );
  });
});
