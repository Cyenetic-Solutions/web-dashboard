import type { Tone } from '@/components/ui/Badge';
import type { Engagement, Finding, Retest } from '@/services/ops.schema';

/** Status tones from admin.md §10.6; labels always accompany colour. */
export const engagementTone: Record<Engagement['status'], Tone> = { PLANNED: 'neutral', ACTIVE: 'accent', REPORTING: 'info', RETESTING: 'warning', COMPLETED: 'success', ON_HOLD: 'subtle', CANCELLED: 'danger' };
export const findingTone: Record<Finding['status'], Tone> = { DRAFT: 'subtle', OPEN: 'danger', IN_REMEDIATION: 'warning', READY_FOR_RETEST: 'info', FIXED_VERIFIED: 'success', RISK_ACCEPTED: 'neutral', FALSE_POSITIVE: 'subtle' };
export const retestTone: Record<Retest['status'], Tone> = { REQUESTED: 'accent', SCHEDULED: 'info', IN_PROGRESS: 'warning', PASSED: 'success', FAILED: 'danger', CANCELLED: 'subtle' };
export const modeHint = { WHITE_BOX: 'Full source and architecture access', GREY_BOX: 'Partial knowledge and test accounts', BLACK_BOX: 'External attacker, no prior knowledge' } as const;
