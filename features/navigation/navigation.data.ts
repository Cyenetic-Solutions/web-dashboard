import type { Permission } from '@/services/permissions';

/** One navigable workspace page. */
export interface NavItem { href: string; title: string; permission: Permission; keywords?: string }
/** Sidebar groups follow the four master-architecture workspaces plus the overview. */
export const navigation: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ href: '/', title: 'Dashboard', permission: 'dashboard:view', keywords: 'kpi home' }] },
  { group: 'Content Studio', items: [
    { href: '/content/posts', title: 'Blog', permission: 'content:read', keywords: 'blog posts articles advisories' },
    { href: '/content/case-studies', title: 'Case studies', permission: 'content:read' },
    { href: '/content/reports', title: 'Reports & insights', permission: 'content:read', keywords: 'whitepapers pdf' },
    { href: '/content/team', title: 'Team', permission: 'content:read', keywords: 'people profiles' },
    { href: '/content/services', title: 'Service domains', permission: 'content:read', keywords: 'catalog subdomains' },
    { href: '/content/media', title: 'Media library', permission: 'content:read', keywords: 'uploads images' },
  ] },
  { group: 'Growth & CRM', items: [
    { href: '/crm/inquiries', title: 'Inquiries', permission: 'crm:read', keywords: 'kanban pipeline leads' },
    { href: '/crm/report-downloads', title: 'Report downloads', permission: 'crm:read', keywords: 'lead analytics' },
    { href: '/crm/newsletter', title: 'Newsletter', permission: 'crm:read', keywords: 'subscribers' },
  ] },
  { group: 'War-Room', items: [
    { href: '/ops/engagements', title: 'Engagements', permission: 'engagements:read', keywords: 'projects' },
    { href: '/ops/findings', title: 'Findings', permission: 'findings:read', keywords: 'cvss vulnerabilities' },
    { href: '/ops/retests', title: 'Retests', permission: 'findings:read', keywords: 'tickets' },
    { href: '/ops/certificates', title: 'Certificates', permission: 'engagements:read', keywords: 'verify' },
  ] },
  { group: 'Governance', items: [
    { href: '/governance/users', title: 'Users & roles', permission: 'users:manage', keywords: 'rbac invite' },
    { href: '/governance/audit-log', title: 'Audit log', permission: 'audit:read', keywords: 'trail integrity' },
  ] },
];
/** Routes rendered without the authenticated shell. */
export const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/invite'];
/** True when a nav item is the active section for a path. */
export function isActive(href: string, path: string) { return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`); }
