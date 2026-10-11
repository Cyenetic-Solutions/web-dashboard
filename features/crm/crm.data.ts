import type { Tone } from '@/components/ui/Badge';
import type { InquiryStatus } from '@/services/crm';

/** Column labels and tones for the pipeline (admin.md §10.6). */
export const stageMeta: Record<InquiryStatus, { label: string; tone: Tone }> = {
  NEW: { label: 'New', tone: 'accent' }, SCOPING_CALL: { label: 'Scoping call', tone: 'info' }, RFP_REVIEW: { label: 'RFP review', tone: 'warning' },
  PROPOSAL_SENT: { label: 'Proposal sent', tone: 'info' }, RETAINER_WON: { label: 'Retainer won', tone: 'success' }, LOST: { label: 'Lost', tone: 'danger' },
};
export const sourceIcon = { CONTACT_FORM: '✉', ESTIMATOR: '∑', MANUAL: '✎' } as const;
