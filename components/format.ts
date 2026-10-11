/** Formats an ISO timestamp as a short, locale-aware date. */
export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}
/** Relative age such as "3 d" or "5 h". */
export function age(value: string | null | undefined, now = Date.now()) {
  if (!value) return '—';
  const minutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} d`;
}
/** Money with currency code. */
export function money(value: number | string | null | undefined, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—';
  const amount = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }) : '—';
}
/** Human file size. */
export function fileSize(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}
/** Converts ENUM_VALUE into "Enum value". */
export function label(value: string) {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
/** Initials for monogram avatars. */
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}
