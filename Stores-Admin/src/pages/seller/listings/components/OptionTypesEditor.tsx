import { useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import useSWR from 'swr';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { cn } from '@/lib/utils';
import { fetchAttributes, fetchAttributeValues, type AttributeOption } from '@/services/sellerListingsService';
import type { OptionType, OptionValue } from '../schema';
import { countCombos, MAX_MATRIX, MAX_OPTION_TYPES, toOptionValue } from './optionUtils';

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

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
                <ValuesCard key={t.attributeId} type={t} onChange={(values) => setValues(t.attributeId, values)} />
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

function ValuesCard({ type, onChange }: { type: OptionType; onChange: (values: OptionValue[]) => void }) {
    const values = useSWR(['catalog:attribute-values', type.attributeId], () => fetchAttributeValues(type.attributeId), SWR_OPTIONS);
    const [search, setSearch] = useState('');

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
            ) : shown.length === 0 ? (
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
                </ul>
            )}

            <p className="mt-2 text-xs text-muted-foreground">Can&apos;t find yours? Contact support on 024 813 8722 and we will add it.</p>
        </Card>
    );
}
