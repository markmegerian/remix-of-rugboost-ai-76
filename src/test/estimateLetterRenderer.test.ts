import { describe, it, expect } from 'vitest';
import {
  renderEstimateLetterDraft,
  type LetterContext,
  type StructuredFindings,
  type Totals,
} from '../lib/estimateLetterRenderer';

const makeFindings = (totals: Totals): StructuredFindings => ({
  rugProfile: {
    origin: 'other',
    construction: 'hand_knotted',
    fiber: 'wool',
    ageCategory: 'contemporary',
    designFamily: 'all_over',
    confidence: 0.7,
  },
  damages: [],
  recommendedServices: [],
  totals,
  reviewFlags: [],
  summary: null,
});

describe('renderEstimateLetterDraft', () => {
  it('generates a single-rug letter with markers', () => {
    const ctx: LetterContext = {
      clientName: 'Ms. Test',
      businessName: 'Megerian Rug Cleaners',
      businessPhone: '(718) 782-7474',
      rugs: [
        {
          rugNumber: '34281',
          label: 'Silk Wool Oriental',
          dimensionsLabel: "9' x 6'",
          findings: makeFindings({
            subtotal: 1361,
            estimatedRangeLow: 1200,
            estimatedRangeHigh: 1500,
            currency: 'USD',
          }),
        },
      ],
    };

    const result = renderEstimateLetterDraft(ctx);
    expect(result.draftText).toContain('Dear Ms. Test,');
    expect(result.draftText).toContain('Rug Breakdown and Services');
    expect(result.draftText).toContain('[HIGHLIGHT_KEY_SERVICE]');
    expect(result.draftText).not.toContain('[HIGHLIGHT_KEY_RUG]');
    expect(result.highlightKeyServiceInput).not.toBeNull();
  });

  it('generates a multi-rug letter with collection markers', () => {
    const ctx: LetterContext = {
      clientName: 'Ms. Test',
      businessName: 'Megerian Rug Cleaners',
      businessPhone: '(718) 782-7474',
      estimateNumber: '3701',
      rugs: [
        {
          rugNumber: '34057',
          label: 'Oriental',
          dimensionsLabel: "3' x 1'",
          findings: makeFindings({
            subtotal: 80,
            estimatedRangeLow: 70,
            estimatedRangeHigh: 100,
            currency: 'USD',
          }),
        },
        {
          rugNumber: '34058',
          label: 'Oriental',
          dimensionsLabel: "3'04\" x 5'04\"",
          findings: makeFindings({
            subtotal: 470,
            estimatedRangeLow: 400,
            estimatedRangeHigh: 550,
            currency: 'USD',
          }),
        },
      ],
      totals: {
        subtotal: 550,
        estimatedRangeLow: 470,
        estimatedRangeHigh: 650,
        currency: 'USD',
      },
      pendingTopics: ['fringe work'],
    };

    const result = renderEstimateLetterDraft(ctx);
    expect(result.draftText).toContain('Estimate #3701');
    expect(result.draftText).toContain('Rug 34057');
    expect(result.draftText).toContain('Rug 34058');
    expect(result.draftText).toContain('[HIGHLIGHT_KEY_SERVICE]');
    expect(result.draftText).toContain('[HIGHLIGHT_KEY_RUG]');
    expect(result.draftText).toContain('[FRINGE_OR_SPECIAL_WORK]');
    expect(result.highlightKeyServiceInput).not.toBeNull();
  });
});
