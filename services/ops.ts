import { dataOf, listOf, query, request } from './http';
import { certificateSchema, deliverableSchema, engagementSchema, findingSchema, retestSchema, type Engagement, type Finding, type FindingInput, type Retest } from './ops.schema';

const admin = '/api/v1/admin';
/** Engagements visible to the caller (auditors only see assigned ones; enforced by the API). */
export async function listEngagements(token: string, signal: AbortSignal, filters: { status?: string; q?: string }) {
  return listOf(engagementSchema).parse(await request(`${admin}/engagements${query(filters)}`, { token, signal })).data;
}
export async function getEngagement(id: string, token: string, signal: AbortSignal) {
  return dataOf(engagementSchema).parse(await request(`${admin}/engagements/${encodeURIComponent(id)}`, { token, signal })).data;
}
/** Creates an engagement; the API assigns the ENG-YYYY-#### code and default milestones. */
export async function createEngagement(input: Pick<Engagement, 'projectName' | 'clientOrganization' | 'auditType' | 'testingMode' | 'startDate'> & { endDate?: string; rulesOfEngagement?: string }, token: string) {
  return dataOf(engagementSchema).parse(await request(`${admin}/engagements`, { token, method: 'POST', body: input })).data;
}
export async function setEngagementStatus(id: string, status: Engagement['status'], token: string) {
  return dataOf(engagementSchema).parse(await request(`${admin}/engagements/${id}/status`, { token, method: 'POST', body: { status } })).data;
}
export async function completeMilestone(engagementId: string, milestoneId: string, done: boolean, token: string) {
  await request(`${admin}/engagements/${engagementId}/milestones/${milestoneId}`, { token, method: 'PATCH', body: { completed: done } });
}
/** Global or per-engagement findings matrix. */
export async function listFindings(token: string, signal: AbortSignal, filters: { engagementId?: string; severity?: string; status?: string; q?: string }) {
  return listOf(findingSchema).parse(await request(`${admin}/findings${query({ ...filters, pageSize: 100 })}`, { token, signal })).data;
}
export async function getFinding(id: string, token: string, signal: AbortSignal) {
  return dataOf(findingSchema).parse(await request(`${admin}/findings/${encodeURIComponent(id)}`, { token, signal })).data;
}
/** Creates (with engagementId) or updates a finding; the API recomputes v3.1 scores from the vector. */
export async function saveFinding(input: FindingInput, token: string, target: { id?: string; engagementId?: string }) {
  const path = target.id ? `${admin}/findings/${target.id}` : `${admin}/engagements/${target.engagementId}/findings`;
  return dataOf(findingSchema).parse(await request(path, { token, method: target.id ? 'PATCH' : 'POST', body: input })).data;
}
export async function verifyFinding(id: string, isVerified: boolean, token: string): Promise<Finding> {
  return dataOf(findingSchema).parse(await request(`${admin}/findings/${id}/verify`, { token, method: 'POST', body: { isVerified } })).data;
}
/** Retest queue or one finding's tickets. */
export async function listRetests(token: string, signal: AbortSignal, filters: { findingId?: string; engagementId?: string } = {}) {
  const path = filters.findingId ? `${admin}/findings/${filters.findingId}/retests` : `${admin}/retests${query({ engagementId: filters.engagementId })}`;
  return listOf(retestSchema).parse(await request(path, { token, signal })).data;
}
export async function requestRetest(findingId: string, requestedNote: string, token: string) {
  return dataOf(retestSchema).parse(await request(`${admin}/findings/${findingId}/retests`, { token, method: 'POST', body: { requestedNote } })).data;
}
/** Updates a ticket; PASSED/FAILED apply the finding lifecycle transactionally server-side. */
export async function updateRetest(id: string, patch: { status: Retest['status']; resultNote?: string }, token: string) {
  return dataOf(retestSchema).parse(await request(`${admin}/retests/${id}`, { token, method: 'PATCH', body: patch })).data;
}
export async function listDeliverables(engagementId: string, token: string, signal: AbortSignal) {
  return listOf(deliverableSchema).parse(await request(`${admin}/engagements/${engagementId}/deliverables`, { token, signal })).data;
}
/** Generates a watermarked PDF from verified findings. */
export async function generateDeliverable(engagementId: string, kind: 'EXECUTIVE' | 'TECHNICAL' | 'RETEST', watermarkText: string, token: string) {
  return dataOf(deliverableSchema).parse(await request(`${admin}/engagements/${engagementId}/deliverables`, { token, method: 'POST', body: { kind, watermarkText } })).data;
}
export async function finalizeDeliverable(engagementId: string, deliverableId: string, token: string) {
  await request(`${admin}/engagements/${engagementId}/deliverables/${deliverableId}/finalize`, { token, method: 'POST' });
}
export async function listCertificates(token: string, signal: AbortSignal) {
  return listOf(certificateSchema).parse(await request(`${admin}/certificates`, { token, signal })).data;
}
/** Issues a certificate for a completed engagement with a READY deliverable. */
export async function issueCertificate(engagementId: string, input: { clientDisplayName: string; scopeSummary: string }, token: string) {
  return dataOf(certificateSchema).parse(await request(`${admin}/engagements/${engagementId}/certificate`, { token, method: 'POST', body: input })).data;
}
export async function revokeCertificate(id: string, reason: string, token: string) {
  return dataOf(certificateSchema).parse(await request(`${admin}/certificates/${id}/revoke`, { token, method: 'POST', body: { reason } })).data;
}
export const verifyUrl = (code: string) => `https://cyenetic.com/verify/${encodeURIComponent(code)}`;
