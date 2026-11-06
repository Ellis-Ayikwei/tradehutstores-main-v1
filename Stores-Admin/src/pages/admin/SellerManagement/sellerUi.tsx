import { Badge } from '@/components/shadcn/badge';
import { cn } from '@/lib/utils';
import type { BusinessType, DocumentStatus, SellerListRow, VerificationStatus } from '@/services/adminSellersService';

export const STATUS_TABS: { value: string; label: string; status: VerificationStatus | '' }[] = [
    { value: 'pending', label: 'Pending', status: 'pending' },
    { value: 'verified', label: 'Verified', status: 'verified' },
    { value: 'rejected', label: 'Rejected', status: 'rejected' },
    { value: 'suspended', label: 'Suspended', status: 'suspended' },
    { value: 'all', label: 'All', status: '' },
];

const KIND_LABELS: Record<string, string> = {
    id_card: 'ID card (front)',
    id_card_back: 'ID card (back)',
    selfie_with_id: 'Selfie with ID',
    proof_of_address: 'Proof of address',
    business_registration: 'Business registration',
};

const ID_TYPE_LABELS: Record<string, string> = {
    ghana_card: 'Ghana Card',
    passport: 'Passport',
    drivers_licence: "Driver's licence",
    voters_id: "Voter's ID",
};

export function humanize(value: string): string {
    const text = value.replace(/_/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export const kindLabel = (kind: string) => KIND_LABELS[kind] ?? humanize(kind);
export const idTypeLabel = (type?: string | null) => (type ? ID_TYPE_LABELS[type] ?? humanize(type) : '');
export const businessTypeLabel = (type?: BusinessType | string | null) => (type === 'registered_business' ? 'Registered business' : type === 'individual' ? 'Individual' : type ? humanize(type) : '');

export function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ownerName(owner: SellerListRow['user'] | undefined): string {
    if (!owner) return '';
    const full = `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim();
    return full || owner.username || '';
}

export function rowDate(row: SellerListRow): string {
    return formatDate(row.updated_on ?? row.updated_at ?? row.created_on);
}

const STATUS_STYLE: Record<VerificationStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'border-transparent bg-warning-subtle text-warning-subtle-foreground' },
    verified: { label: 'Verified', className: 'border-transparent bg-success-subtle text-success-subtle-foreground' },
    rejected: { label: 'Rejected', className: 'border-transparent bg-destructive-subtle text-destructive-subtle-foreground' },
    suspended: { label: 'Suspended', className: 'border-transparent bg-muted text-foreground' },
};

export function StatusBadge({ status, className }: { status: VerificationStatus | string; className?: string }) {
    const style = STATUS_STYLE[status as VerificationStatus];
    return (
        <Badge variant="outline" className={cn(style?.className, className)}>
            {style?.label ?? humanize(String(status))}
        </Badge>
    );
}

const DOC_STYLE: Record<DocumentStatus, { label: string; className: string }> = {
    pending: { label: 'Awaiting review', className: 'border-transparent bg-warning-subtle text-warning-subtle-foreground' },
    approved: { label: 'Approved', className: 'border-transparent bg-success-subtle text-success-subtle-foreground' },
    rejected: { label: 'Rejected', className: 'border-transparent bg-destructive-subtle text-destructive-subtle-foreground' },
};

export function DocStatusBadge({ status }: { status: DocumentStatus | string }) {
    const style = DOC_STYLE[status as DocumentStatus];
    return (
        <Badge variant="outline" className={style?.className}>
            {style?.label ?? humanize(String(status))}
        </Badge>
    );
}

export function MissingChip({ kinds, className }: { kinds: string[]; className?: string }) {
    if (kinds.length === 0) return null;
    return (
        <span className={cn('inline-flex max-w-full items-center rounded-full bg-warning-subtle px-2 py-0.5 text-xs font-medium text-warning-subtle-foreground', className)}>
            <span className="truncate">Missing: {kinds.map(kindLabel).join(', ')}</span>
        </span>
    );
}

const MAX_QUEUE_CHIPS = 3;

/** Normalises list rows (names) and detail (`{id, name}`) to a clean list of names. */
export function categoryNames(categories?: (string | { name: string })[] | null): string[] {
    return (categories ?? []).map((c) => (typeof c === 'string' ? c : c.name)).filter((name) => Boolean(name && name.trim()));
}

export const OTHER_CATEGORY_HINT = 'Not in the catalog — consider adding this category';

const CHIP = 'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium';

export function OtherCategoryChip({ text, className }: { text?: string | null; className?: string }) {
    const value = text?.trim();
    if (!value) return null;
    return (
        <span className={cn(CHIP, 'bg-warning-subtle text-warning-subtle-foreground', className)} title={OTHER_CATEGORY_HINT}>
            <span className="truncate">Other: {value}</span>
        </span>
    );
}

/** Up to `limit` category chips, "+N" for the rest, and an "Other" marker when the seller typed their own category. */
export function CategoryChips({ names, other, limit = MAX_QUEUE_CHIPS, className }: { names: string[]; other?: string | null; limit?: number; className?: string }) {
    const hasOther = Boolean(other?.trim());
    if (names.length === 0 && !hasOther) return null;
    const shown = names.slice(0, limit);
    const rest = names.length - shown.length;
    return (
        <ul className={cn('flex flex-wrap items-center gap-1', className)} aria-label="Categories">
            {shown.map((name) => (
                <li key={name} className={cn(CHIP, 'bg-muted text-foreground')}>
                    <span className="truncate">{name}</span>
                </li>
            ))}
            {rest > 0 ? (
                <li className={cn(CHIP, 'bg-muted text-muted-foreground')} title={names.slice(limit).join(', ')}>
                    +{rest}
                </li>
            ) : null}
            {hasOther ? (
                <li className={cn(CHIP, 'bg-warning-subtle text-warning-subtle-foreground')} title={`Other: ${other?.trim()}. ${OTHER_CATEGORY_HINT}`}>
                    Other
                </li>
            ) : null}
        </ul>
    );
}
