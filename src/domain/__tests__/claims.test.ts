import { canTransition, makeId, newClaim, summarizeWallet } from '../claims';
import type { Claim, Opportunity } from '../types';

const o = {
  id: 'opp',
  estimatedPayoutMin: 100,
  estimatedPayoutMax: 200,
} as Opportunity;

describe('claims', () => {
  it('newClaim starts saved with the midpoint estimate', () => {
    const c = newClaim(o, new Date('2026-09-17T00:00:00Z'), 'clm_1');
    expect(c).toMatchObject({
      id: 'clm_1',
      opportunityId: 'opp',
      status: 'saved',
      estimatedPayout: 150,
    });
    expect(c.createdAt).toBe('2026-09-17T00:00:00.000Z');
  });

  it('enforces the status lifecycle', () => {
    expect(canTransition('saved', 'in_progress')).toBe(true);
    expect(canTransition('saved', 'paid')).toBe(false);
    expect(canTransition('submitted', 'paid')).toBe(true);
    expect(canTransition('paid', 'saved')).toBe(false);
    expect(canTransition('rejected', 'in_progress')).toBe(true);
  });

  it('summarizeWallet totals by status', () => {
    const mk = (status: Claim['status'], estimatedPayout: number, paidAmount?: number): Claim => ({
      id: status,
      opportunityId: 'o',
      status,
      estimatedPayout,
      createdAt: '',
      updatedAt: '',
      paidAmount,
    });
    const s = summarizeWallet([
      mk('saved', 100),
      mk('in_progress', 50),
      mk('submitted', 25),
      mk('paid', 10, 12),
      mk('paid', 10),
      mk('rejected', 999),
      mk('expired', 999),
    ]);
    expect(s.potential).toBe(175);
    expect(s.pending).toBe(25);
    expect(s.paid).toBe(22);
    expect(s.counts).toEqual({
      saved: 1,
      in_progress: 1,
      submitted: 1,
      paid: 2,
      rejected: 1,
      expired: 1,
    });
  });

  it('makeId is deterministic', () => {
    expect(makeId('clm', 35)).toBe('clm_z');
    expect(makeId('clm', 35)).toBe(makeId('clm', 35));
  });
});
