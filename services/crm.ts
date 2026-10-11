import { z } from 'zod';
import { dataOf, listOf, query, request } from './http';

/** Kanban stages in pipeline order. */
export const inquiryStatuses = ['NEW', 'SCOPING_CALL', 'RFP_REVIEW', 'PROPOSAL_SENT', 'RETAINER_WON', 'LOST'] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];
const money = z.union([z.number(), z.string()]).nullable().optional();
export const inquirySchema = z.object({
  id: z.string(), fullName: z.string(), workEmail: z.string(), phone: z.string().nullable().optional(), company: z.string().nullable().optional(),
  sector: z.string().nullable().optional(), serviceType: z.string().nullable().optional(), serviceDomain: z.string().nullable().optional(),
  targetEnvironment: z.string().nullable().optional(), scopeDetails: z.string().nullable().optional(), estimatorPayload: z.record(z.string(), z.unknown()).nullable().optional(),
  budgetRange: z.string().nullable().optional(), desiredStartDate: z.string().nullable().optional(), preferredContact: z.string().nullable().optional(),
  source: z.enum(['CONTACT_FORM', 'ESTIMATOR', 'MANUAL']), status: z.enum(inquiryStatuses), kanbanPosition: z.number(),
  dealValue: money, currency: z.string().nullable().optional(), lostReason: z.string().nullable().optional(),
  assignedTo: z.object({ id: z.string(), fullName: z.string() }).nullable().optional(), convertedEngagementId: z.string().nullable().optional(), createdAt: z.string(),
});
/** Inquiry card/detail as returned by the CRM API. */
export type Inquiry = z.infer<typeof inquirySchema>;
const noteSchema = z.object({ id: z.string(), body: z.string(), authorName: z.string().nullable(), createdAt: z.string() });
export type InquiryNote = z.infer<typeof noteSchema>;
const base = '/api/v1/admin/inquiries';

/** All open-board inquiries grouped by status. */
export async function loadBoard(token: string, signal: AbortSignal) {
  return dataOf(z.record(z.string(), z.array(inquirySchema))).parse(await request(`${base}/board`, { token, signal })).data;
}
/** Persists a Kanban move; LOST requires a reason (validated again by the API). */
export async function moveInquiry(id: string, status: InquiryStatus, position: number, token: string, lostReason?: string) {
  return dataOf(inquirySchema).parse(await request(`${base}/${id}/move`, { token, method: 'POST', body: { status, position, lostReason } })).data;
}
/** Manual inquiry entry (source MANUAL). */
export async function createInquiry(input: { fullName: string; workEmail: string; company?: string; scopeDetails?: string }, token: string) {
  return dataOf(inquirySchema).parse(await request(base, { token, method: 'POST', body: input })).data;
}
/** Partial update of commercial fields. */
export async function updateInquiry(id: string, patch: { dealValue?: number | null; currency?: string }, token: string) {
  return dataOf(inquirySchema).parse(await request(`${base}/${id}`, { token, method: 'PATCH', body: patch })).data;
}
/** Notes timeline for one inquiry. */
export async function listNotes(id: string, token: string, signal: AbortSignal) {
  return dataOf(z.array(noteSchema)).parse(await request(`${base}/${id}/notes`, { token, signal })).data;
}
export async function addNote(id: string, body: string, token: string) {
  return dataOf(noteSchema).parse(await request(`${base}/${id}/notes`, { token, method: 'POST', body: { body } })).data;
}
/** Creates an engagement pre-filled from the inquiry and returns its id. */
export async function convertInquiry(id: string, token: string) {
  return dataOf(z.object({ engagementId: z.string() })).parse(await request(`${base}/${id}/convert`, { token, method: 'POST' })).data;
}

/** Fractional index between two neighbours (admin.md §7.3). */
export function positionBetween(before?: number, after?: number) {
  if (before === undefined && after === undefined) return 1024;
  if (before === undefined) return (after ?? 0) - 1024;
  if (after === undefined) return before + 1024;
  return (before + after) / 2;
}

const leadSchema = z.object({ id: z.string(), fullName: z.string(), email: z.string(), companyName: z.string().nullable(), emailDomain: z.string(),
  isCorporate: z.boolean(), reportTitle: z.string(), downloadedAt: z.string() });
export type ReportLead = z.infer<typeof leadSchema>;
const domainSchema = z.object({ domain: z.string(), leads: z.number(), lastDownload: z.string(), reports: z.array(z.string()) });
/** Leads and per-domain aggregation for a date range. */
export async function loadLeads(token: string, signal: AbortSignal, from: string) {
  const [leads, domains] = await Promise.all([request(`/api/v1/admin/report-leads${query({ from, pageSize: 100 })}`, { token, signal }), request(`/api/v1/admin/report-leads/domains${query({ from })}`, { token, signal })]);
  return { leads: listOf(leadSchema).parse(leads).data, domains: dataOf(z.array(domainSchema)).parse(domains).data };
}

export const subscriberStatuses = ['PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED'] as const;
const subscriberSchema = z.object({ id: z.string(), email: z.string(), fullName: z.string().nullable(), status: z.enum(subscriberStatuses),
  source: z.string().nullable(), tags: z.array(z.string()), subscribedAt: z.string(), confirmedAt: z.string().nullable() });
export type Subscriber = z.infer<typeof subscriberSchema>;
/** Newsletter subscribers with filters. */
export async function listSubscribers(token: string, signal: AbortSignal, filters: { status?: string; q?: string }) {
  return listOf(subscriberSchema).parse(await request(`/api/v1/admin/newsletter${query({ ...filters, pageSize: 100 })}`, { token, signal })).data;
}
/** Manual add creates a CONFIRMED subscriber (staff attest consent). */
export async function addSubscriber(input: { email: string; fullName?: string; tags: string[] }, token: string) {
  return dataOf(subscriberSchema).parse(await request('/api/v1/admin/newsletter', { token, method: 'POST', body: input })).data;
}
export async function setSubscriberStatus(id: string, status: Subscriber['status'], token: string) {
  return dataOf(subscriberSchema).parse(await request(`/api/v1/admin/newsletter/${id}`, { token, method: 'PATCH', body: { status } })).data;
}
