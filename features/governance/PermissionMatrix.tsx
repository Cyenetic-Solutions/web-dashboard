import { staffRoles } from '@/services/api';
import { matrix, permissions } from '@/services/permissions';

/** Read-only RBAC matrix so administrators understand each role. Auditor scoping to assigned engagements is server-side. */
export default function PermissionMatrix() {
  return <section className="border border-line bg-surface"><h2 className="cye-label border-b border-line p-4 text-muted">Permission matrix</h2>
    <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm" aria-label="Permissions by role">
      <thead><tr><th scope="col" className="cye-label p-3 text-left text-muted">Permission</th>{staffRoles.map((r) => <th key={r} scope="col" className="cye-label p-3 text-muted">{r}</th>)}</tr></thead>
      <tbody>{permissions.map((p) => <tr key={p} className="border-t border-line"><th scope="row" className="p-3 text-left font-mono text-xs font-normal">{p}</th>
        {staffRoles.map((r) => <td key={r} className="p-3 text-center">{matrix[r].includes(p) ? <span className="text-success">✓<span className="sr-only"> allowed</span></span> : <span className="text-subtle">—<span className="sr-only"> not allowed</span></span>}</td>)}</tr>)}</tbody>
    </table></div></section>;
}
