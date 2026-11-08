import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';
import { createdValueId, fetchMyValueRequests, type AttributeValueRequest, type RequestValueOutcome } from '@/services/attributeRequestsService';
import { fetchAttributes, fetchAttributeValues, type AttributeOption } from '@/services/sellerListingsService';
import type { OptionType, OptionValue } from '../schema';
import { countCombos, MAX_MATRIX, MAX_OPTION_TYPES, toOptionValue } from './optionUtils';
import { RequestValueDialog } from './RequestValueDialog';

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const;
/** The seller's own requests refresh when they return to the tab, so an approval shows up without a reload. */
const REQUEST_SWR_OPTIONS = { revalidateOnFocus: true, shouldRetryOnError: false } as const;
const PENDING_KEY = 'catalog:value-requests:mine:pending';
const APPROVED_KEY = 'catalog:value-requests:mine:approved';

interface OptionTypesEditorProps {
    types: OptionType[];
    onChange: (next: OptionType[]) => void;
    /** Shown under the types when the seller wants named options instead. */
    onUseNames?: () => void;
    error?: string;
}

/** Step A: choose 1-3 option types. Step B: choose the values for each. */
export function OptionTypesEditor({ types, onChange, onUseNames, error }: OptionTypesEditorProps) {
    const attributes = useSWR<AttributeOption[]>('catalog:attributes', fetchAttributes, SWR_OPTIONS);
    const chosen = new Set(types.map((t) => t.attributeId));
    const available = (attributes.data ?? []).filter((a) => !chosen.has(a.id));
    const combos = countCombos(types);

    const pending = useSWR<AttributeValueRequest[]>(PENDING_KEY, () => fetchMyValueRequests('pending'), REQUEST_SWR_OPTIONS);
    const approved = useSWR<AttributeValueRequest[]>(APPROVED_KEY, () => fetchMyValueRequests('approved'), REQUEST_SWR_OPTIONS);
    const addPending = (request: AttributeValueRequest) => void pending.mutate((current) => [request, ...(current ?? []).filter((r) => r.id !== request.id)], { revalidate: false });

    const addType = (a: AttributeOption) => onChange([...types, { attributeId: a.id, name: a.name, displayType: a.displayType, values: [] }]);
    const removeType = (id: string) => onChange(types.filter((t) => t.attributeId !== id));
    const setValues = (id: string, values: OptionValue[]) => onChange(types.map((t) => (t.attributeId === id ? { ...t, values } : t)));

    return (
        <div className="space-y-3">
            <Card className="p-3">
                <h3 className="text-sm font-semibold text-foreground">1. Option types</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">What can buyers choose between? Pick up to {MAX_OPTION_TYPES}, for example Colour and Size.</p>

                {types.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Chosen option types">
                        {types.map((t) => (
                            <li key={t.attributeId}>
                                <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 text-xs">
                                    {t.name}
                                    <button
                                        type="button"
                                        onClick={() => removeType(t.attributeId)}
                                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label={`Remove ${t.name}`}
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                </Badge>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {attributes.isLoading ? (
                    <div className="mt-2 flex gap-1.5" aria-busy="true">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                ) : attributes.error ? (
                    <p className="mt-2 text-sm text-destructive" role="alert">
                        Could not load option types.{' '}
                        <button type="button" className="font-semibold underline" onClick={() => void attributes.mutate()}>
                            Try again
                        </button>
                    </p>
                ) : (attributes.data ?? []).length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No option types are set up yet. Contact support on 024 813 8722 to have Colour and Size added.</p>
                ) : types.length < MAX_OPTION_TYPES && available.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {available.map((a) => (
                            <Button key={a.id} type="button" variant="outline" size="sm" onClick={() => addType(a)}>
                                <Plus aria-hidden="true" />
                                {a.name}
                            </Button>
                        ))}
                    </div>
                ) : null}

                {onUseNames ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Need something else?{' '}
                        <button type="button" className="font-semibold text-foreground underline" onClick={onUseNames}>
                            Use simple named options instead
                        </button>
                    </p>
                ) : null}
            </Card>

            {types.map((t) => (
                <ValuesCard
                    key={t.attributeId}
                    type={t}
                    onChange={(values) => setValues(t.attributeId, values)}
                    pending={(pending.data ?? []).filter((r) => String(r.attribute.id) === t.attributeId)}
                    approved={(approved.data ?? []).filter((r) => String(r.attribute.id) === t.attributeId)}
                    onRequested={addPending}
                />
            ))}

            {combos > MAX_MATRIX ? (
                <p role="alert" className="rounded-lg bg-warning-subtle p-3 text-sm text-warning-subtle-foreground">
                    These choices make {combos} combinations. Only the first {MAX_MATRIX} are listed below. Remove some values to keep every combination.
                </p>
            ) : null}
            {error ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

interface ValuesCardProps {
    type: OptionType;
    onChange: (values: OptionValue[]) => void;
    /** This option type's requests waiting for staff. */
    pending: AttributeValueRequest[];
    /** This option type's approved requests, used to refetch values when a new one has been added. */
    approved: AttributeValueRequest[];
    onRequested: (request: AttributeValueRequest) => void;
}

function PendingChip({ request }: { request: AttributeValueRequest }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    tabIndex={0}
                    className="flex h-8 cursor-default items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${request.value_name}, pending review. You'll be able to use it once our team approves it.`}
                >
                    {request.color_code ? <span className="h-3.5 w-3.5 shrink-0 rounded-full border" style={{ backgroundColor: request.color_code }} aria-hidden="true" /> : null}
                    {request.value_name} · pending review
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
            </TooltipTrigger>
            <TooltipContent>You&apos;ll be able to use it once our team approves it</TooltipContent>
        </Tooltip>
    );
}

function ValuesCard({ type, onChange, pending, approved, onRequested }: ValuesCardProps) {
    const values = useSWR(['catalog:attribute-values', type.attributeId], () => fetchAttributeValues(type.attributeId), SWR_OPTIONS);
    const [search, setSearch] = useState('');
    const [requestOpen, setRequestOpen] = useState(false);
    const refetchedFor = useRef(new Set<string>());

    // A request staff approved since this list loaded: refetch once so the new value appears and can be picked.
    useEffect(() => {
        if (!values.data) return;
        const loaded = new Set(values.data.map((v) => v.id));
        const fresh = approved.filter((r) => {
            const id = createdValueId(r);
            return id !== null && !loaded.has(id) && !refetchedFor.current.has(r.id);
        });
        if (fresh.length === 0) return;
        fresh.forEach((r) => refetchedFor.current.add(r.id));
        void values.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [approved, values.data]);

    // Saved values stay selectable even if the catalog no longer lists them.
    const all = useMemo(() => {
        const fromApi = (values.data ?? []).map(toOptionValue);
        const extra = type.values.filter((v) => !fromApi.some((x) => x.id === v.id));
        return [...fromApi, ...extra];
    }, [values.data, type.values]);
    const selected = new Set(type.values.map((v) => v.id));
    const needle = search.trim().toLowerCase();
    const shown = needle ? all.filter((v) => v.label.toLowerCase().includes(needle)) : all;

    const toggle = (v: OptionValue) => onChange(selected.has(v.id) ? type.values.filter((x) => x.id !== v.id) : [...type.values, v]);
    const selectOnly = (v: OptionValue) => {
        if (!selected.has(v.id)) onChange([...type.values, v]);
    };

    const handleMatched = (v: OptionValue) => {
        selectOnly(v);
        toast.success(`${v.label} already exists — selected it for you`);
    };

    const handleOutcome = (outcome: RequestValueOutcome) => {
        if (outcome.kind === 'created') {
            onRequested(outcome.request);
            toast.success(`Request sent for ${outcome.request.value_name}. Our team will review it.`);
        } else if (outcome.kind === 'already_requested') {
            onRequested(outcome.request);
            toast.info(`${outcome.request.value_name} is already waiting for review.`);
        } else {
            const v = outcome.value;
            selectOnly({ id: String(v.id), label: v.value_name, colorCode: v.color_code || undefined, image: null });
            void values.mutate();
            toast.success(`${v.value_name} already exists — selected it for you`);
        }
    };

    const shownPending = needle ? pending.filter((r) => r.value_name.toLowerCase().includes(needle)) : pending;

    return (
        <Card className="p-3">
            <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{type.name} values</h3>
                <span className="text-xs text-muted-foreground">{type.values.length} selected</span>
            </div>

            {all.length > 10 ? <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${type.name.toLowerCase()}`} className="mt-2" aria-label={`Search ${type.name} values`} autoComplete="off" /> : null}

            {values.isLoading ? (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-busy="true">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                </div>
            ) : values.error ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                    Could not load {type.name.toLowerCase()} values.{' '}
                    <button type="button" className="font-semibold underline" onClick={() => void values.mutate()}>
                        Try again
                    </button>
                </p>
            ) : shown.length === 0 && shownPending.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{all.length === 0 ? `No ${type.name.toLowerCase()} values exist yet.` : 'Nothing matches your search.'}</p>
            ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                    {shown.map((v) => {
                        const on = selected.has(v.id);
                        return (
                            <li key={v.id}>
                                <button
                                    type="button"
                                    onClick={() => toggle(v)}
                                    aria-pressed={on}
                                    className={cn(
                                        'flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        on ? 'border-primary bg-primary-subtle text-primary-subtle-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
                                    )}
                                >
                                    {v.colorCode ? <span className="h-3.5 w-3.5 shrink-0 rounded-full border" style={{ backgroundColor: v.colorCode }} aria-hidden="true" /> : null}
                                    {v.label}
                                    {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                                </button>
                            </li>
                        );
                    })}
                    {shownPending.map((r) => (
                        <li key={`pending-${r.id}`}>
                            <TooltipProvider delayDuration={150}>
                                <PendingChip request={r} />
                            </TooltipProvider>
                        </li>
                    ))}
                </ul>
            )}

            <p className="mt-2 text-xs text-muted-foreground">
                Can&apos;t find yours?{' '}
                <button type="button" className="font-semibold text-foreground underline" onClick={() => setRequestOpen(true)}>
                    Request a new value
                </button>
            </p>

            <RequestValueDialog
                open={requestOpen}
                onOpenChange={setRequestOpen}
                attributeId={type.attributeId}
                attributeName={type.name}
                displayType={type.displayType}
                existing={all}
                onOutcome={handleOutcome}
                onMatchedExisting={handleMatched}
            />
        </Card>
    );
}
