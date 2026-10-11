import { z } from 'zod';

export const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export const engagementStatuses = ['PLANNED', 'ACTIVE', 'REPORTING', 'RETESTING', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] as const;
export const findingStatuses = ['DRAFT', 'OPEN', 'IN_REMEDIATION', 'READY_FOR_RETEST', 'FIXED_VERIFIED', 'RISK_ACCEPTED', 'FALSE_POSITIVE'] as const;
export const retestStatuses = ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'CANCELLED'] as const;
export const testingModes = ['WHITE_BOX', 'GREY_BOX', 'BLACK_BOX'] as const;
const person = z.object({ id: z.string(), fullName: z.string() }).nullable().optional();

export const milestoneSchema = z.object({ id: z.string(), title: z.string(), dueDate: z.string(), completedAt: z.string().nullable(), sortOrder: z.number() });
export const engagementSchema = z.object({
  id: z.string(), code: z.string(), projectName: z.string(), clientOrganization: z.string(), auditType: z.string(), additionalCategories: z.array(z.string()).default([]),
  testingMode: z.enum(testingModes), status: z.enum(engagementStatuses), startDate: z.string(), endDate: z.string().nullable().optional(),
  leadAuditor: person, progressPercent: z.number().int().min(0).max(100), rulesOfEngagement: z.string().nullable().optional(),
  scopeAssets: z.array(z.object({ type: z.string(), value: z.string(), notes: z.string().nullable().optional() })).nullable().optional(),
  milestones: z.array(milestoneSchema).optional(), members: z.array(z.object({ userId: z.string(), fullName: z.string(), roleLabel: z.string().nullable().optional() })).optional(),
  openBySeverity: z.partialRecord(z.enum(severities), z.number()).optional(),
});
/** Engagement summary/detail from the War-Room API. */
export type Engagement = z.infer<typeof engagementSchema>;
export const findingSchema = z.object({
  id: z.string(), engagementId: z.string(), engagementCode: z.string().optional(), referenceCode: z.string(), title: z.string(), description: z.string().default(''),
  severity: z.enum(severities), severityOverrideReason: z.string().nullable().optional(), cvssVersion: z.enum(['V3_1', 'V4_0']), cvssVector: z.string().nullable().optional(),
  cvssScore: z.coerce.number().nullable().optional(), cweId: z.string().nullable().optional(), affectedEndpoint: z.string(), pocText: z.string().nullable().optional(),
  remediationGuidance: z.string().nullable().optional(), references: z.array(z.string()).default([]), status: z.enum(findingStatuses), isVerified: z.boolean(),
  retestStatus: z.enum(retestStatuses).nullable().optional(), hasProofVideo: z.boolean().optional(), updatedAt: z.string(),
});
export type Finding = z.infer<typeof findingSchema>;
/** Editable finding fields sent on create/update. */
export type FindingInput = Pick<Finding, 'title' | 'description' | 'severity' | 'cvssVersion' | 'affectedEndpoint' | 'status'> & {
  cvssVector: string | null; cvssScore: number | null; severityOverrideReason: string | null; cweId: string | null; pocText: string | null; remediationGuidance: string | null; references: string[];
};
export const retestSchema = z.object({ id: z.string(), findingId: z.string(), findingRef: z.string(), findingTitle: z.string(), severity: z.enum(severities), engagementCode: z.string(),
  status: z.enum(retestStatuses), requestedNote: z.string().nullable(), resultNote: z.string().nullable(), scheduledFor: z.string().nullable(), assignedTo: person, updatedAt: z.string() });
export type Retest = z.infer<typeof retestSchema>;
export const deliverableSchema = z.object({ id: z.string(), kind: z.enum(['EXECUTIVE', 'TECHNICAL', 'RETEST']), version: z.number(), status: z.enum(['GENERATING', 'READY', 'FAILED']),
  sha256: z.string().nullable(), findingCount: z.number(), watermarkText: z.string(), errorMessage: z.string().nullable().optional(), isFinal: z.boolean().optional(), createdAt: z.string(), generatedBy: z.string().nullable().optional() });
export type Deliverable = z.infer<typeof deliverableSchema>;
export const certificateSchema = z.object({ id: z.string(), certificateCode: z.string(), engagementCode: z.string(), clientDisplayName: z.string(), scopeSummary: z.string(),
  testingPeriodStart: z.string(), testingPeriodEnd: z.string(), sha256Checksum: z.string(), issuedAt: z.string(), revokedAt: z.string().nullable(), revokeReason: z.string().nullable() });
export type Certificate = z.infer<typeof certificateSchema>;
