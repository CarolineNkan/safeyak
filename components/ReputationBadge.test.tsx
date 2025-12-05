import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import ReputationBadge from './ReputationBadge';

describe('ReputationBadge Unit Tests', () => {
  describe('Badge tier boundaries', () => {
    it('displays Rookie badge for score 0', () => {
      const { container } = render(<ReputationBadge score={0} />);
      expect(container.textContent).toContain('🐣');
      expect(container.textContent).toContain('Rookie');
      expect(container.querySelector('.border-slate-500\\/50')).toBeTruthy();
    });

    it('displays Rookie badge for score 20', () => {
      const { container } = render(<ReputationBadge score={20} />);
      expect(container.textContent).toContain('🐣');
      expect(container.textContent).toContain('Rookie');
    });

    it('displays Active badge for score 21', () => {
      const { container } = render(<ReputationBadge score={21} />);
      expect(container.textContent).toContain('🔥');
      expect(container.textContent).toContain('Active');
      expect(container.querySelector('.border-orange-500\\/50')).toBeTruthy();
    });

    it('displays Active badge for score 50', () => {
      const { container } = render(<ReputationBadge score={50} />);
      expect(container.textContent).toContain('🔥');
      expect(container.textContent).toContain('Active');
    });

    it('displays Trusted badge for score 51', () => {
      const { container } = render(<ReputationBadge score={51} />);
      expect(container.textContent).toContain('⭐');
      expect(container.textContent).toContain('Trusted');
      expect(container.querySelector('.border-blue-500\\/50')).toBeTruthy();
    });

    it('displays Trusted badge for score 100', () => {
      const { container } = render(<ReputationBadge score={100} />);
      expect(container.textContent).toContain('⭐');
      expect(container.textContent).toContain('Trusted');
    });

    it('displays Elite badge for score 101', () => {
      const { container } = render(<ReputationBadge score={101} />);
      expect(container.textContent).toContain('💎');
      expect(container.textContent).toContain('Elite');
      expect(container.querySelector('.border-cyan-500\\/50')).toBeTruthy();
    });

    it('displays Elite badge for score 250', () => {
      const { container } = render(<ReputationBadge score={250} />);
      expect(container.textContent).toContain('💎');
      expect(container.textContent).toContain('Elite');
    });

    it('displays Legend badge for score 251', () => {
      const { container } = render(<ReputationBadge score={251} />);
      expect(container.textContent).toContain('👑');
      expect(container.textContent).toContain('Legend');
      expect(container.querySelector('.border-yellow-500\\/50')).toBeTruthy();
    });

    it('displays Legend badge for score 1000', () => {
      const { container } = render(<ReputationBadge score={1000} />);
      expect(container.textContent).toContain('👑');
      expect(container.textContent).toContain('Legend');
    });
  });

  describe('CSS classes', () => {
    it('applies correct base CSS classes', () => {
      const { container } = render(<ReputationBadge score={50} />);
      const badge = container.firstChild as HTMLElement;
      
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('gap-1');
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('py-0.5');
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('border');
      expect(badge.className).toContain('bg-slate-950/80');
      expect(badge.className).toContain('text-xs');
    });

    it('applies correct border color for each tier', () => {
      const tiers = [
        { score: 10, borderClass: 'border-slate-500/50' },
        { score: 30, borderClass: 'border-orange-500/50' },
        { score: 75, borderClass: 'border-blue-500/50' },
        { score: 150, borderClass: 'border-cyan-500/50' },
        { score: 300, borderClass: 'border-yellow-500/50' },
      ];

      tiers.forEach(({ score, borderClass }) => {
        const { container } = render(<ReputationBadge score={score} />);
        const badge = container.firstChild as HTMLElement;
        expect(badge.className).toContain(borderClass);
      });
    });
  });

  describe('Text content', () => {
    it('displays text in slate-300 color', () => {
      const { container } = render(<ReputationBadge score={50} />);
      const textElement = container.querySelector('.text-slate-300');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe('Active');
    });
  });
});

/**
 * Feature: reputation-system, Property 1: Badge rendering for all posts
 * Validates: Requirements 1.1
 * 
 * Property: For any reputation score, the badge component should display
 * the correct tier (emoji and label) according to the tier boundaries.
 */
describe('ReputationBadge Property-Based Tests', () => {
  it('Property 1: Badge tier consistency for all reputation scores', () => {
    fc.assert(
      fc.property(
        // Generate random reputation scores from 0 to 1000
        fc.integer({ min: 0, max: 1000 }),
        (score) => {
          const { container } = render(<ReputationBadge score={score} />);
          
          // Determine expected badge based on score
          let expectedEmoji: string;
          let expectedLabel: string;
          let expectedBorderClass: string;
          
          if (score >= 251) {
            expectedEmoji = '👑';
            expectedLabel = 'Legend';
            expectedBorderClass = 'border-yellow-500/50';
          } else if (score >= 101) {
            expectedEmoji = '💎';
            expectedLabel = 'Elite';
            expectedBorderClass = 'border-cyan-500/50';
          } else if (score >= 51) {
            expectedEmoji = '⭐';
            expectedLabel = 'Trusted';
            expectedBorderClass = 'border-blue-500/50';
          } else if (score >= 21) {
            expectedEmoji = '🔥';
            expectedLabel = 'Active';
            expectedBorderClass = 'border-orange-500/50';
          } else {
            expectedEmoji = '🐣';
            expectedLabel = 'Rookie';
            expectedBorderClass = 'border-slate-500/50';
          }
          
          // Verify the badge displays the correct tier
          expect(container.textContent).toContain(expectedEmoji);
          expect(container.textContent).toContain(expectedLabel);
          
          // Verify the correct border color is applied
          const badge = container.firstChild as HTMLElement;
          expect(badge.className).toContain(expectedBorderClass);
          
          // Verify tier boundaries are respected
          // (the logic above already ensures this by checking the score ranges)
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in the design
    );
  });

  it('Property 1 (edge case): Badge handles negative scores gracefully', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (score) => {
          const { container } = render(<ReputationBadge score={score} />);
          
          // For negative scores, should display Rookie badge (lowest tier)
          expect(container.textContent).toContain('🐣');
          expect(container.textContent).toContain('Rookie');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (edge case): Badge handles extremely large scores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1001, max: 1000000 }),
        (score) => {
          const { container } = render(<ReputationBadge score={score} />);
          
          // For very large scores, should display Legend badge (highest tier)
          expect(container.textContent).toContain('👑');
          expect(container.textContent).toContain('Legend');
        }
      ),
      { numRuns: 100 }
    );
  });
});
