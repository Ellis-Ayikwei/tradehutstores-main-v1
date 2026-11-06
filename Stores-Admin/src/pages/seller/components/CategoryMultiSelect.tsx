import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { cn } from '@/lib/utils';
import { fetchCategories, sellerListingsApi } from '@/services/sellerListingsService';
import type { SellerApiError } from '@/services/sellerStatsService';

export const MAX_SELLING_CATEGORIES = 10;

export interface CategoryOption {
    id: string;
    name: string;
}

interface CategoryMultiSelectProps {
    /** Selected category ids. */
    value: string[];
    onChange: (ids: string[]) => void;
    /** Names for ids that may not be in the loaded catalog yet (e.g. from the saved profile). */
    knownCategories?: CategoryOption[];
    max?: number;
    disabled?: boolean;
    invalid?: boolean;
    id?: string;
    /** Marks the field as described by helper/error text elsewhere. */
    'aria-describedby'?: string;
}

const letterOf = (name: string) => {
    const first = name.trim().charAt(0).toUpperCase();
    return /[A-Z]/.test(first) ? first : '#';
};

/**
 * Searchable multi-select for catalog categories. Selected categories show as removable chips; a dialog
 * (search + checkbox list grouped alphabetically) adds or removes them. Categories come from `catalog/categories/`.
 */
export function CategoryMultiSelect({ value, onChange, knownCategories = [], max = MAX_SELLING_CATEGORIES, disabled, invalid, id, 'aria-describedby': describedBy }: CategoryMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const { data, error, isLoading, isValidating, mutate } = useSWR<{ id: string; label: string }[], SellerApiError>(sellerListingsApi.categories, fetchCategories, {
        shouldRetryOnError: false,
        revalidateOnFocus: false,
        dedupingInterval: 60000,
    });

    const options = useMemo<CategoryOption[]>(() => (data ?? []).map((c) => ({ id: c.id, name: c.label })).sort((a, b) => a.name.localeCompare(b.name)), [data]);

    const nameById = useMemo(() => {
        const map = new Map<string, string>();
        knownCategories.forEach((c) => map.set(String(c.id), c.name));
        options.forEach((c) => map.set(c.id, c.name));
        return map;
    }, [knownCategories, options]);

    const selected = useMemo(() => new Set(value), [value]);
    const atMax = value.length >= max;

    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = needle ? options.filter((c) => c.name.toLowerCase().includes(needle)) : options;
        const byLetter = new Map<string, CategoryOption[]>();
        filtered.forEach((c) => {
            const letter = letterOf(c.name);
            byLetter.set(letter, [...(byLetter.get(letter) ?? []), c]);
        });
        return Array.from(byLetter.entries()).sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
    }, [options, query]);

    const toggle = (categoryId: string, checked: boolean) => {
        if (checked) {
            if (selected.has(categoryId) || atMax) return;
            onChange([...value, categoryId]);
        } else {
            onChange(value.filter((v) => v !== categoryId));
        }
    };

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) setQuery('');
    };

    return (
        <div className="space-y-2">
            {value.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Selected categories">
                    {value.map((categoryId) => {
                        const name = nameById.get(categoryId) ?? 'Category';
                        return (
                            <li key={categoryId} className="inline-flex h-8 max-w-full items-center rounded-full bg-primary-subtle pl-3 text-xs font-medium text-primary-subtle-foreground">
                                <span className="truncate">{name}</span>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChange(value.filter((v) => v !== categoryId))}
                                    aria-label={`Remove ${name}`}
                                    className="ml-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    className={cn('h-11 md:h-9', invalid && 'border-destructive')}
                >
                    <Plus aria-hidden="true" />
                    {value.length > 0 ? 'Edit categories' : 'Choose categories'}
                </Button>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                    {value.length} of {max} selected
                </span>
            </div>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-md flex-col gap-3 p-4">
                    <DialogHeader>
                        <DialogTitle className="text-base">Categories you sell</DialogTitle>
                        <DialogDescription>Pick everything you sell, up to {max}.</DialogDescription>
                    </DialogHeader>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') event.preventDefault();
                            }}
                            placeholder="Search categories"
                            aria-label="Search categories"
                            className="h-11 pl-8 md:h-9"
                        />
                    </div>

                    <div className="min-h-[8rem] flex-1 overflow-y-auto rounded-md border" role="group" aria-label="Categories">
                        {isLoading && !data ? (
                            <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading categories">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-full" />
                                ))}
                            </div>
                        ) : error && !data ? (
                            <div role="alert" className="space-y-2 p-3 text-sm">
                                <p className="text-destructive">We could not load the categories. Please try again.</p>
                                <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                                    Retry
                                </Button>
                            </div>
                        ) : groups.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground">{query.trim() ? `No categories match "${query.trim()}".` : 'No categories are available yet.'}</p>
                        ) : (
                            groups.map(([letter, items]) => (
                                <div key={letter}>
                                    <p className="sticky top-0 border-b bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{letter}</p>
                                    <ul>
                                        {items.map((c) => {
                                            const checked = selected.has(c.id);
                                            const blocked = !checked && atMax;
                                            const inputId = `category-option-${c.id}`;
                                            return (
                                                <li key={c.id}>
                                                    <label
                                                        htmlFor={inputId}
                                                        className={cn('flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted md:min-h-9', blocked && 'cursor-not-allowed text-muted-foreground hover:bg-background')}
                                                    >
                                                        <Checkbox id={inputId} checked={checked} disabled={blocked} onCheckedChange={(state) => toggle(c.id, state === true)} />
                                                        <span className="min-w-0 flex-1 break-words">{c.name}</span>
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter className="items-center gap-2 sm:justify-between">
                        <p className="text-xs text-muted-foreground" aria-live="polite">
                            {atMax ? `You have chosen the maximum of ${max}.` : `${value.length} of ${max} selected`}
                        </p>
                        <Button type="button" onClick={() => handleOpenChange(false)} className="h-11 md:h-9">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
