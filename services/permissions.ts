import type { StaffRole } from './api';

/** Permission names mirror the API RBAC matrix; UI checks are convenience only. */
export const permissions = ['dashboard:view', 'content:read', 'content:write', 'content:publish', 'team:write', 'media:write',
  'crm:read', 'crm:write', 'crm:export', 'engagements:read', 'engagements:write', 'findings:read', 'findings:write',
  'retests:request', 'retests:resolve', 'deliverables:generate', 'deliverables:download', 'certificates:issue',
  'users:manage', 'audit:read'] as const;
export type Permission = (typeof permissions)[number];

const auditor: Permission[] = ['dashboard:view', 'content:read', 'media:write', 'crm:read', 'engagements:read', 'engagements:write',
  'findings:read', 'findings:write', 'retests:request', 'retests:resolve', 'deliverables:generate', 'deliverables:download'];
const editor: Permission[] = ['dashboard:view', 'content:read', 'content:write', 'team:write', 'media:write',
  'crm:read', 'crm:write', 'crm:export'];

/** Role → permission matrix (admin.md §9.2). Publishing stays Super Admin only to match the current API. Auditor scoping is server-side. */
export const matrix: Record<StaffRole, readonly Permission[]> = {
  'Super Admin': permissions,
  'Security Auditor': auditor,
  'Content Editor': editor,
};

/** Returns whether a role holds a permission. */
export function can(role: StaffRole | undefined, permission: Permission) {
  return !!role && matrix[role].includes(permission);
}
