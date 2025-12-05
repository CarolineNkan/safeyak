# Implementation Plan

- [x] 1. Create reputation API route




  - Create `app/api/reputation/route.ts` with GET handler
  - Accept `hash` query parameter
  - Call `get_reputation` RPC function via Supabase client
  - Return JSON with reputation value (default 0 for errors)
  - _Requirements: 2.1, 2.2, 2.3_
-

- [x] 1.1 Write property test for reputation API





  - **Property 2: API returns numeric reputation**
  - **Validates: Requirements 2.2**
-

- [x] 2. Create ReputationBadge component




  - Create `components/ReputationBadge.tsx`
  - Implement badge tier logic (5 tiers: Rookie, Active, Trusted, Elite, Legend)
  - Apply neon border styling consistent with existing cards
  - Use text-xs, rounded-full, with subtle glow
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1_

- [x] 2.1 Write unit tests for badge tiers







  - Test boundary values: 0, 20, 21, 50, 51, 100, 101, 250, 251
  - Verify correct emoji and label for each tier
  - Verify CSS classes applied correctly
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2.2 Write property test for badge tier consistency








  - **Property 1: Badge rendering for all posts**
  - **Validates: Requirements 1.1**
-

- [x] 3. Update FeedWithComposer to enrich posts with reputation




  - Add useEffect to fetch reputation for all post authors after initial load
  - Create reputation map from author_hash to reputation score
  - Merge reputation data into posts state
  - Handle duplicate author hashes efficiently
  - _Requirements: 2.4_

- [x] 3.1 Write property test for reputation enrichment







  - **Property 3: Posts enriched with reputation**
  - **Validates: Requirements 2.4**
- [x] 4. Update FeedClient to display reputation badges










- [ ] 4. Update FeedClient to display reputation badges

  - Import ReputationBadge component
  - Add badge next to ghost avatar in post header
  - Pass `post.reputation ?? 0` as score prop
  - Ensure layout doesn't break with new element
  - _Requirements: 1.1, 7.3_



- [x] 5. Add real-time reputation updates to FeedClient






  - Create new Supabase channel "reputation-updates"
  - Subscribe to UPDATE events on reputation table
  - Update posts state when reputation changes for displayed authors
  - Properly cleanup subscription on unmount
  - _Requirements: 5.1, 5.2_
-



- [x] 5.1 Write property test for real-time updates








  - **Property 7: Real-time reputation u
pdates**
  - **Validates: Requirements 5.1, 5.2**



- [x] 6. Create ProfileDrawer component





  - Create `components/ProfileDrawer.tsx`
  - Accept isOpen, onClose, authorHash props
  - Implement slide-up animation from bottom
  - Add blurred backdrop overlay
  - Display large centered ghost avatar
  - Display prominent reputation badge
  - Fetch and display profile stats using get_profile_stats RPC
  - Show statistics grid: posts, comments, upvotes, bookmarks, join date
  - Implement progress bar toward next badge tier
  - Add close button (X icon, top-right)
  - Apply dark background with neon border styling

  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.2_

- [x] 6.1 Write unit tests for ProfileDrawer









  - Test drawer opens/closes correctly
  - Test statistics display with mock data
  - Test progress bar calculation
  - _Requirements: 3.3, 3.5_

- [ ]* 6.2 Write property test for profile statistics
  - **Property 4: Profile statistics completeness**
  - **Validates: Requirements 3.3**

- [ ]* 6.3 Write property test for progress bar

  - **Property 5: Progress bar accuracy**

  - **Validates: Requirements 3.5**

- [x] 7. Add profile drawer real-time updates




  - Subscribe to reputation updates in ProfileDrawer
  - Refresh profile stats when reputation changes
  - Only update if drawer is open and hash matches
  - _Requirements: 5.3_

- [ ]* 7.1 Write property test for profile real-time sync
  - **Property 8: Profile drawer real-time sync**

  - **Validates: Requirements 5.3**


- [x] 8. Update layout with bottom navigation and profile button





  - Convert `app/layout.tsx` to client component
  - Add state for profile drawer (isOpen, authorHash)
  - Load author hash from localStorage on mount
  - Create bottom navigation bar with profile button (👤 icon)
  - Wire profile button to open ProfileDrawer
  - Pass ProfileDrawer component with props
  - Apply safe-area-bottom padding for mobile
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8.1 Write property test for drawer interaction










  - **Property 6: Profile drawer interac
tion**
  - **Validates: Requirements 4.2, 4.3**


- [x] 9. Update TypeScript types





  - Verify `types/Post.ts` includes optional `reputation?: number` field
  - Verify `types/UserProfile.ts` includes all required fields
  - Run TypeScript compilation to ensure zero errors


  - _Requirements: 6.1, 6.2, 6.3_

-


- [x] 10. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.
