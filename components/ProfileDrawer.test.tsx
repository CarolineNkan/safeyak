import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileDrawer from './ProfileDrawer';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('ProfileDrawer Unit Tests', () => {
  const mockStats = {
    reputation: 75,
    post_count: 12,
    comment_count: 34,
    upvotes_received: 56,
    bookmarks_received: 8,
    joined_at: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock channel subscription
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };
    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  describe('Drawer open/close behavior', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <ProfileDrawer isOpen={false} onClose={() => {}} authorHash="test-hash" />
      );
      
      expect(container.textContent).toBe('');
    });

    it('renders when isOpen is true', () => {
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      // Check for ghost avatar emoji
      expect(screen.getByText('👻')).toBeTruthy();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      const { container } = render(
        <ProfileDrawer isOpen={true} onClose={onClose} authorHash="test-hash" />
      );
      
      const backdrop = container.querySelector('.backdrop-blur-md');
      expect(backdrop).toBeTruthy();
      
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={onClose} authorHash="test-hash" />
      );
      
      const closeButton = screen.getByLabelText('Close profile');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics display', () => {
    it('displays loading state initially', () => {
      (supabase.rpc as any).mockImplementation(() => new Promise(() => {}));
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('displays all statistics with mock data', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        expect(screen.getByText('12')).toBeTruthy(); // post_count
        expect(screen.getByText('Posts')).toBeTruthy();
        expect(screen.getByText('34')).toBeTruthy(); // comment_count
        expect(screen.getByText('Comments')).toBeTruthy();
        expect(screen.getByText('56')).toBeTruthy(); // upvotes_received
        expect(screen.getByText('Upvotes')).toBeTruthy();
        expect(screen.getByText('8')).toBeTruthy(); // bookmarks_received
        expect(screen.getByText('Bookmarks')).toBeTruthy();
      });
    });

    it('displays formatted join date', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Joined Jan 15, 2024/)).toBeTruthy();
      });
    });

    it('displays error message when stats fail to load', async () => {
      (supabase.rpc as any).mockResolvedValue({ 
        data: null, 
        error: { message: 'Failed to fetch' } 
      });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Unable to load profile')).toBeTruthy();
      });
    });
  });

  describe('Progress bar calculation', () => {
    it('calculates progress correctly for mid-tier score', async () => {
      const stats = { ...mockStats, reputation: 35 }; // Active tier (21-50)
      (supabase.rpc as any).mockResolvedValue({ data: stats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        // Progress from 21 to 51: (35-21)/(51-21) = 14/30 = 46.67%
        expect(screen.getByText(/47% to next tier/)).toBeTruthy();
        expect(screen.getByText('35 XP')).toBeTruthy();
        expect(screen.getByText('51 XP')).toBeTruthy();
      });
    });

    it('calculates progress at tier boundary (start)', async () => {
      const stats = { ...mockStats, reputation: 21 }; // Start of Active tier
      (supabase.rpc as any).mockResolvedValue({ data: stats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        // Progress from 21 to 51: (21-21)/(51-21) = 0/30 = 0%
        expect(screen.getByText(/0% to next tier/)).toBeTruthy();
      });
    });

    it('calculates progress at tier boundary (end)', async () => {
      const stats = { ...mockStats, reputation: 50 }; // End of Active tier
      (supabase.rpc as any).mockResolvedValue({ data: stats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        // Progress from 21 to 51: (50-21)/(51-21) = 29/30 = 96.67%
        expect(screen.getByText(/97% to next tier/)).toBeTruthy();
      });
    });

    it('shows max tier message for Legend tier', async () => {
      const stats = { ...mockStats, reputation: 300 }; // Legend tier
      (supabase.rpc as any).mockResolvedValue({ data: stats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        expect(screen.getByText('🎉 Max Tier Reached!')).toBeTruthy();
      });
    });

    it('calculates progress for Rookie tier', async () => {
      const stats = { ...mockStats, reputation: 10 }; // Rookie tier (0-20)
      (supabase.rpc as any).mockResolvedValue({ data: stats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        // Progress from 0 to 21: (10-0)/(21-0) = 10/21 = 47.62%
        expect(screen.getByText(/48% to next tier/)).toBeTruthy();
        expect(screen.getByText('10 XP')).toBeTruthy();
        expect(screen.getByText('21 XP')).toBeTruthy();
      });
    });

    it('calculates progress for Elite tier', async () => {
      const stats = { ...mockStats, reputation: 150 }; // Elite tier (101-250)
      (supabase.rpc as any).mockResolvedValue({ data: stats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        // Progress from 101 to 251: (150-101)/(251-101) = 49/150 = 32.67%
        expect(screen.getByText(/33% to next tier/)).toBeTruthy();
        expect(screen.getByText('150 XP')).toBeTruthy();
        expect(screen.getByText('251 XP')).toBeTruthy();
      });
    });
  });

  describe('Reputation badge display', () => {
    it('displays reputation badge with correct score', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      const { container } = render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      await waitFor(() => {
        // Score 75 should show Trusted badge
        expect(container.textContent).toContain('⭐');
        expect(container.textContent).toContain('Trusted');
      });
    });
  });

  describe('Real-time updates', () => {
    it('subscribes to reputation updates when drawer is open', () => {
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      expect(supabase.channel).toHaveBeenCalledWith('profile-reputation-updates');
    });

    it('does not subscribe when drawer is closed', () => {
      render(
        <ProfileDrawer isOpen={false} onClose={() => {}} authorHash="test-hash" />
      );
      
      expect(supabase.channel).not.toHaveBeenCalled();
    });

    it('cleans up subscription on unmount', () => {
      (supabase.rpc as any).mockResolvedValue({ data: mockStats, error: null });
      
      const { unmount } = render(
        <ProfileDrawer isOpen={true} onClose={() => {}} authorHash="test-hash" />
      );
      
      unmount();
      
      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });
});
