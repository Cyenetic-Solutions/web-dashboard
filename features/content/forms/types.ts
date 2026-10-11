import type { ContentInput } from '@/services/content.schema';

/** Payload type for one content kind. */
export type DataOf<K extends ContentInput['kind']> = Extract<ContentInput, { kind: K }>['data'];
/** Props shared by every kind-specific form: the payload, a change callback and Zod errors keyed by field. */
export interface FormProps<K extends ContentInput['kind']> { value: DataOf<K>; onChange: (value: DataOf<K>) => void; errors: Record<string, string> }
