import { Badge } from '@/components/shadcn/badge';
import { cn } from '@/lib/utils';
import type { AttributeRequestStatus, AttributeValueRequest } from '@/services/attributeRequestsService';

// `status` is sent as the API's `status` query param; the backend accepts a comma list.
export const STATUS_TABS: { value: string; label: string; status: string }[] = [
    { value: 'pending', label: 'Pending', status: 'pending' },
    { value: 'approved', label: 'Approved', status: 'approved,duplicate' },
    { value: 'rejected', label: 'Rejected', status: 'rejected' },
    { value: 'all', label: 'All', status: '' },
];

const STATUS_STYLE: Record<AttributeRequestStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'border-transparent bg-warning-subtle text-warning-subtle-foreground' },
    approved: { label: 'Approved', className: 'border-transparent bg-success-subtle text-success-subtle-foreground' },
    duplicate: { label: 'Linked to existing', className: 'border-transparent bg-info-subtle text-info-subtle-foreground' },
    rejected: { label: 'Rejected', className: 'border-transparent bg-destructive-subtle text-destructive-subtle-foreground' },
};

export function StatusBadge({ status, className }: { status: AttributeRequestStatus | string; className?: string }) {
    const style = STATUS_STYLE[status as AttributeRequestStatus];
    return (
        <Badge variant="outline" className={cn(style?.className ?? 'border-transparent bg-muted text-foreground', className)}>
            {style?.label ?? status}
        </Badge>
    );
}

export function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function requesterLabel(row: AttributeValueRequest): { primary: string; secondary: string } {
    const store = row.requester?.store_name?.trim() ?? '';
    const email = row.requester?.email?.trim() ?? '';
    return { primary: store || email || '-', secondary: store ? email : '' };
}

export function ValueCell({ row }: { row: AttributeValueRequest }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-2">
            {row.color_code ? <span className="h-4 w-4 shrink-0 rounded-full border" style={{ backgroundColor: row.color_code }} aria-hidden="true" /> : null}
            <span className="truncate font-semibold text-foreground">{row.value_name}</span>
        </span>
    );
}
