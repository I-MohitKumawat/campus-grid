/**
 * lib/constants/club-positions.ts
 *
 * Fixed collegiate position definitions, UI labels, and helper types.
 * Safe for client-side and server-side imports.
 */

export type ClubPosition =
  | 'president'
  | 'vice_president'
  | 'secretary'
  | 'vice_secretary'
  | 'treasurer'
  | 'technical_lead'
  | 'outreach_lead'
  | 'member';

export const CLUB_POSITION_LABELS: Record<ClubPosition | string, string> = {
  president: 'President',
  vice_president: 'Vice President',
  secretary: 'Secretary',
  vice_secretary: 'Vice Secretary',
  treasurer: 'Treasurer',
  technical_lead: 'Technical Lead',
  outreach_lead: 'PR & Outreach Lead',
  member: 'Member',
};
