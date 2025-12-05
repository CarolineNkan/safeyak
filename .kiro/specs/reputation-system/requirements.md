# Requirements Document

## Introduction

The SafeYak Reputation System provides users with a gamified experience that rewards positive contributions and discourages negative behavior. The system displays user reputation scores, badges, profile statistics, and updates in real-time as users interact with the platform.

## Glossary

- **Reputation System**: The XP-based scoring mechanism that tracks user contributions and behavior
- **Author Hash**: Anonymous identifier for users that persists across sessions
- **Reputation Badge**: Visual indicator showing user's reputation tier
- **Profile Drawer**: Slide-up UI component displaying user statistics and reputation
- **RPC Function**: Remote Procedure Call function executed in Supabase database
- **Real-time Channel**: Supabase subscription mechanism for live data updates

## Requirements

### Requirement 1

**User Story:** As a user, I want to see reputation badges on posts, so that I can identify trusted contributors.

#### Acceptance Criteria

1. WHEN a post is displayed THEN the system SHALL show a reputation badge next to the author's avatar
2. WHEN reputation is between 0-20 THEN the system SHALL display "🐣 Rookie" badge
3. WHEN reputation is between 21-50 THEN the system SHALL display "🔥 Active" badge
4. WHEN reputation is between 51-100 THEN the system SHALL display "⭐ Trusted" badge
5. WHEN reputation is between 101-250 THEN the system SHALL display "💎 Elite" badge
6. WHEN reputation is 251 or higher THEN the system SHALL display "👑 Legend" badge

### Requirement 2

**User Story:** As a user, I want to fetch reputation data from the backend, so that accurate scores are displayed.

#### Acceptance Criteria

1. WHEN the system requests reputation for an author hash THEN the system SHALL call the get_reputation RPC function
2. WHEN the API receives a valid author hash THEN the system SHALL return the reputation score as a number
3. WHEN the API receives an invalid or missing author hash THEN the system SHALL return a default reputation of 0
4. WHEN posts are loaded THEN the system SHALL fetch reputation for each post's author

### Requirement 3

**User Story:** As a user, I want to view my profile statistics, so that I can track my contributions and progress.

#### Acceptance Criteria

1. WHEN a user opens the profile drawer THEN the system SHALL display the user's ghost avatar
2. WHEN the profile drawer is open THEN the system SHALL display the user's reputation badge
3. WHEN the profile drawer is open THEN the system SHALL display post count, comment count, upvotes received, and bookmarks received
4. WHEN the profile drawer is open THEN the system SHALL display the user's join date
5. WHEN the profile drawer is open THEN the system SHALL display a progress bar showing advancement toward the next badge tier

### Requirement 4

**User Story:** As a user, I want to access my profile from the navigation, so that I can easily view my statistics.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a profile button in the bottom navigation
2. WHEN a user clicks the profile button THEN the system SHALL open the profile drawer
3. WHEN the profile drawer is open and the user clicks close THEN the system SHALL close the drawer

### Requirement 5

**User Story:** As a user, I want to see reputation updates in real-time, so that my score reflects my latest contributions immediately.

#### Acceptance Criteria

1. WHEN a user's reputation changes in the database THEN the system SHALL receive a real-time update notification
2. WHEN a reputation update is received THEN the system SHALL refresh the affected user's reputation badge
3. WHEN the profile drawer is open and reputation changes THEN the system SHALL update the displayed statistics
4. WHEN a user receives a comment on their post THEN the system SHALL update their reputation by +2 points
5. WHEN a user's post receives an upvote THEN the system SHALL update their reputation by +1 point

### Requirement 6

**User Story:** As a developer, I want type-safe reputation data structures, so that the codebase remains maintainable and error-free.

#### Acceptance Criteria

1. WHEN the UserProfile type is used THEN the system SHALL include reputation, post_count, comment_count, upvotes_received, bookmarks_received, and joined_at fields
2. WHEN the Post type is used THEN the system SHALL include an optional reputation field for the author
3. WHEN TypeScript compilation runs THEN the system SHALL produce zero type errors related to reputation data

### Requirement 7

**User Story:** As a user, I want the reputation UI to match the existing design system, so that the experience feels cohesive.

#### Acceptance Criteria

1. WHEN reputation badges are displayed THEN the system SHALL use neon borders consistent with the existing card design
2. WHEN the profile drawer is displayed THEN the system SHALL use dark background with blurred backdrop
3. WHEN reputation components are rendered THEN the system SHALL maintain the ghost avatar styling
4. WHEN the profile drawer animates THEN the system SHALL slide up from the bottom smoothly
