import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GET } from './route';
import { NextRequest } from 'next/server';

/**
 * Feature: reputation-system, Property 2: API returns numeric reputation
 * Validates: Requirements 2.2
 * 
 * Property: For any valid author hash, calling the reputation API should return 
 * a response containing a numeric reputation value.
 */

// Mock the Supabase client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    rpc: vi.fn(),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

describe('Reputation API Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 2: API returns numeric reputation for any valid author hash', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid author hashes (alphanumeric strings of reasonable length)
        fc.stringMatching(/^[a-zA-Z0-9]{8,64}$/),
        // Generate random reputation values (0-1000)
        fc.integer({ min: 0, max: 1000 }),
        async (authorHash, mockReputation) => {
          // Mock the RPC call to return the generated reputation
          const mockRpc = vi.fn().mockResolvedValue({
            data: mockReputation,
            error: null,
          });

          (createServerClient as any).mockReturnValue({
            rpc: mockRpc,
          });

          // Create a mock request with the author hash
          const url = `http://localhost:3000/api/reputation?hash=${authorHash}`;
          const request = new NextRequest(url);

          // Call the API
          const response = await GET(request);
          const data = await response.json();

          // Verify the RPC was called with correct parameters
          expect(mockRpc).toHaveBeenCalledWith('get_reputation', {
            p_hash: authorHash,
          });

          // Property: Response must contain a numeric reputation value
          expect(data).toHaveProperty('reputation');
          expect(typeof data.reputation).toBe('number');
          expect(data.reputation).toBe(mockReputation);
          expect(Number.isFinite(data.reputation)).toBe(true);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in the design
    );
  });

  it('Property 2 (edge case): API returns 0 for missing hash parameter', async () => {
    const url = 'http://localhost:3000/api/reputation';
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    // Should return error for missing hash
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('Property 2 (edge case): API returns 0 when RPC fails', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{8,64}$/),
        async (authorHash) => {
          // Mock RPC to return an error
          const mockRpc = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          });

          (createServerClient as any).mockReturnValue({
            rpc: mockRpc,
          });

          const url = `http://localhost:3000/api/reputation?hash=${authorHash}`;
          const request = new NextRequest(url);

          const response = await GET(request);
          const data = await response.json();

          // Property: Even on error, must return numeric reputation (default 0)
          expect(data).toHaveProperty('reputation');
          expect(typeof data.reputation).toBe('number');
          expect(data.reputation).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (edge case): API returns 0 when RPC returns null', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z0-9]{8,64}$/),
        async (authorHash) => {
          // Mock RPC to return null data
          const mockRpc = vi.fn().mockResolvedValue({
            data: null,
            error: null,
          });

          (createServerClient as any).mockReturnValue({
            rpc: mockRpc,
          });

          const url = `http://localhost:3000/api/reputation?hash=${authorHash}`;
          const request = new NextRequest(url);

          const response = await GET(request);
          const data = await response.json();

          // Property: Must return numeric reputation (default 0 for null)
          expect(data).toHaveProperty('reputation');
          expect(typeof data.reputation).toBe('number');
          expect(data.reputation).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
