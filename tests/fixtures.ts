/** Fictional API responses used only by browser tests at the mocked HTTP boundary. */
const now = new Date('2026-10-10T12:00:00Z').toISOString();
const day = (n: number) => new Date(Date.parse(now) - n * 86400000).toISOString();
const list = (data: unknown[]) => ({ data, meta: { page: 1, pageSize: 100, total: data.length, totalPages: 1 } });

export const dashboard = {
  summary: { data: { openInquiries: 12, activeEngagements: 4, openCriticalHigh: 7, downloads30d: 63, downloadsDeltaPct: 18, publishedPosts: 9, confirmedSubscribers: 214 } },
  charts: { data: { pipeline: [['NEW', 5], ['SCOPING_CALL', 3], ['RFP_REVIEW', 2], ['PROPOSAL_SENT', 2], ['RETAINER_WON', 4], ['LOST', 2]].map(([status, count]) => ({ status, count })),
    downloadsPerDay: Array.from({ length: 30 }, (_, i) => ({ date: day(29 - i).slice(0, 10), count: (i * 7) % 5 + (i % 3) })),
    findingsBySeverity: [['CRITICAL', 2], ['HIGH', 5], ['MEDIUM', 9], ['LOW', 6], ['INFO', 3]].map(([severity, count]) => ({ severity, count })),
    engagementsByStatus: [['ACTIVE', 2], ['REPORTING', 1], ['RETESTING', 1], ['COMPLETED', 3]].map(([status, count]) => ({ status, count })) } },
  activity: { data: [{ id: 'a1', actorName: 'Rafi Analyst', action: 'STATUS_CHANGE', summary: 'published "Breaking OAuth in Fintech APIs"', resourceType: 'BLOG_POST', createdAt: day(0.1) },
    { id: 'a2', actorName: 'Mina Auditor', action: 'CREATE', summary: 'logged finding F-007 on ENG-2026-0042', resourceType: 'FINDING', createdAt: day(0.4) }] },
  upcoming: { data: [{ kind: 'MILESTONE', title: 'Reporting', dueAt: day(-2), context: 'ENG-2026-0042 · Northwind Pay' }, { kind: 'RETEST', title: 'F-003 IDOR on /api/accounts', dueAt: day(-4), context: null }] },
};
const inquiry = (id: string, status: string, company: string, position: number, extra: object = {}) => ({ id, fullName: 'Jordan Lee', workEmail: `jordan@${company.toLowerCase().replace(/\W/g, '')}.example`, company, sector: 'FINANCE_BANKING',
  serviceType: 'WEB_APP', source: 'CONTACT_FORM', status, kanbanPosition: position, dealValue: 18000, currency: 'USD', createdAt: day(3), ...extra });
export const board = { data: { NEW: [inquiry('i1', 'NEW', 'Northwind Pay', 1024), inquiry('i2', 'NEW', 'Contoso Health', 2048, { source: 'ESTIMATOR', estimatorPayload: { webApps: 3, apis: 2 } })],
  SCOPING_CALL: [inquiry('i3', 'SCOPING_CALL', 'Fabrikam Retail', 1024)], RFP_REVIEW: [], PROPOSAL_SENT: [inquiry('i4', 'PROPOSAL_SENT', 'Tailspin SaaS', 1024)], RETAINER_WON: [], LOST: [] } };
export const engagement = { id: 'e1', code: 'ENG-2026-0042', projectName: 'Payments API assessment', clientOrganization: 'Northwind Pay', auditType: 'API', additionalCategories: [], testingMode: 'GREY_BOX',
  status: 'ACTIVE', startDate: day(10), endDate: day(-10), leadAuditor: { id: 'u2', fullName: 'Mina Auditor' }, progressPercent: 55, rulesOfEngagement: 'Testing window 22:00–06:00 UTC. No DoS.',
  scopeAssets: [{ type: 'url', value: 'https://api.northwind.example', notes: null }], members: [{ userId: 'u3', fullName: 'Sam Tester', roleLabel: 'API tester' }],
  milestones: ['Kick-off', 'Recon', 'Exploitation', 'Reporting', 'Retest'].map((title, i) => ({ id: `m${i}`, title, dueDate: day(10 - i * 5), completedAt: i < 2 ? day(9 - i * 5) : null, sortOrder: i })),
  openBySeverity: { CRITICAL: 1, HIGH: 2, MEDIUM: 3 } };
export const finding = { id: 'f1', engagementId: 'e1', engagementCode: 'ENG-2026-0042', referenceCode: 'F-001', title: 'SQL injection in /search', description: 'User input reaches a raw query.', severity: 'CRITICAL',
  cvssVersion: 'V3_1', cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', cvssScore: 9.8, cweId: 'CWE-89', affectedEndpoint: 'GET /api/search?q=', references: [], status: 'OPEN', isVerified: true, retestStatus: null, updatedAt: day(1) };
export const fixtures: Record<string, unknown> = {
  '/api/v1/admin/dashboard/summary': dashboard.summary, '/api/v1/admin/dashboard/charts': dashboard.charts,
  '/api/v1/admin/dashboard/activity': dashboard.activity, '/api/v1/admin/dashboard/upcoming': dashboard.upcoming,
  '/api/v1/admin/inquiries/board': board,
  '/api/v1/admin/engagements': list([engagement]), '/api/v1/admin/engagements/e1': { data: engagement },
  '/api/v1/admin/findings': list([finding, { ...finding, id: 'f2', referenceCode: 'F-002', title: 'Missing rate limit on login', severity: 'MEDIUM', cvssScore: 5.3, status: 'IN_REMEDIATION', isVerified: false }]),
  '/api/v1/admin/findings/f1': { data: finding }, '/api/v1/admin/findings/f1/retests': list([]), '/api/v1/admin/retests': list([]), '/api/v1/admin/engagements/e1/deliverables': list([]),
  '/api/v1/admin/certificates': list([]), '/api/v1/admin/content/posts': [], '/api/v1/admin/media': list([]),
  '/api/v1/admin/report-leads': list([{ id: 'l1', fullName: 'Ava Chen', email: 'ava@northwind.example', companyName: 'Northwind', emailDomain: 'northwind.example', isCorporate: true, reportTitle: 'API Security Checklist', downloadedAt: day(2) }]),
  '/api/v1/admin/report-leads/domains': { data: [{ domain: 'northwind.example', leads: 1, lastDownload: day(2), reports: ['API Security Checklist'] }] },
  '/api/v1/admin/newsletter': list([{ id: 's1', email: 'reader@contoso.example', fullName: null, status: 'CONFIRMED', source: 'footer', tags: ['research'], subscribedAt: day(20), confirmedAt: day(20) }]),
  '/api/v1/admin/users': list([{ id: 'staff-1', email: 'analyst@cyenetic.com', fullName: 'Rafi Analyst', role: 'Super Admin', status: 'ACTIVE', lastLoginAt: day(0), createdAt: day(90) }]),
  '/api/v1/admin/audit-logs': list([{ id: 'log1', actorEmail: 'analyst@cyenetic.com', action: 'LOGIN_SUCCESS', resourceType: 'USER', resourceId: 'staff-1', summary: 'Signed in with email code', ipAddress: '203.0.113.7', createdAt: day(0) }]),
  '/api/v1/admin/account/sessions': { data: [{ id: 'ses1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130', ipAddress: '203.0.113.7', lastUsedAt: day(0), createdAt: day(0), current: true }] },
};
