import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
    addSectionItem,
    createMerchSection,
    deleteSectionItem,
    fetchMerchSectionDetail,
    merchAdminErrorMessage,
    patchMerchSection,
    type HomepageSectionAdminDetail,
    type HomepageSectionAdminList,
    type PopulationRulePayload,
    type SectionWritePayload,
} from '@/services/merchandisingAdminService';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import {
    ACCENT_PRESETS,
    BACKGROUND_PRESETS,
    RULE_TYPES,
    SECTION_TYPES,
    STRATEGIES,
    emptyRule,
    fromDatetimeLocal,
    slugify,
    toDatetimeLocal,
} from './constants';

type SheetTab = 'general' | 'rule' | 'items';

const NO_CATEGORY = '__none__';

interface SectionSheetProps {
    open: boolean;
    /** null = create a new section. */
    section: HomepageSectionAdminList | null;
    /** Number of existing sections, used as the default position for a new one. */
    sectionCount: number;
    categories: { id: string; name: string }[];
    onOpenChange: (open: boolean) => void;
    /** Called after any change that should refresh the list. */
    onChanged: () => Promise<void> | void;
}

export function SectionSheet({ open, section, sectionCount, categories, onOpenChange, onChanged }: SectionSheetProps) {
    const selectedId = section?.id ?? null;

    const [tab, setTab] = useState<SheetTab>('general');
    const [saving, setSaving] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<HomepageSectionAdminDetail | null>(null);
    const [newProductId, setNewProductId] = useState('');
    const [addingItem, setAddingItem] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [slug, setSlug] = useState('');
    const [sectionType, setSectionType] = useState('horizontal_scroll');
    const [strategy, setStrategy] = useState('auto');
    const [maxProducts, setMaxProducts] = useState(12);
    const [position, setPosition] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [showCountdown, setShowCountdown] = useState(false);
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('');
    const [accentColor, setAccentColor] = useState('');
    const [rule, setRule] = useState<PopulationRulePayload>(emptyRule);

    // Reset / load whenever the sheet opens for a (different) section.
    useEffect(() => {
        if (!open) return;
        setTab('general');
        setNewProductId('');

        if (section == null) {
            setDetail(null);
            setDetailLoading(false);
            setTitle('');
            setSubtitle('');
            setSlug('');
            setSectionType('horizontal_scroll');
            setStrategy('auto');
            setMaxProducts(12);
            setPosition(sectionCount);
            setIsActive(true);
            setShowCountdown(false);
            setStartsAt('');
            setEndsAt('');
            setBackgroundColor('');
            setAccentColor('');
            setRule(emptyRule());
            return;
        }

        let cancelled = false;
        setDetail(null);
        setDetailLoading(true);
        (async () => {
            try {
                const d = await fetchMerchSectionDetail(section.id);
                if (cancelled) return;
                setDetail(d);
                setTitle(d.title);
                setSubtitle(d.subtitle || '');
                setSlug(d.slug);
                setSectionType(d.section_type);
                setStrategy(d.strategy);
                setMaxProducts(d.max_products);
                setPosition(d.position);
                setIsActive(d.is_active);
                setShowCountdown(d.show_countdown);
                setStartsAt(toDatetimeLocal(d.starts_at));
                setEndsAt(toDatetimeLocal(d.ends_at));
                setBackgroundColor(d.background_color || '');
                setAccentColor(d.accent_color || '');
                setRule(
                    d.rule
                        ? ({
                              ...emptyRule(),
                              ...d.rule,
                              min_rating: Number(d.rule.min_rating),
                              category: d.rule.category ? String(d.rule.category) : null,
                          } as PopulationRulePayload)
                        : emptyRule()
                );
            } catch (e) {
                if (cancelled) return;
                toast.error(merchAdminErrorMessage(e));
                onOpenChange(false);
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, section]);

    const buildPayload = (): SectionWritePayload => ({
        title,
        subtitle,
        slug: slug || slugify(title),
        section_type: sectionType,
        max_products: maxProducts,
        position,
        is_active: isActive,
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
        strategy,
        background_color: backgroundColor,
        accent_color: accentColor,
        show_countdown: showCountdown,
        rule: strategy === 'manual' ? null : { ...rule },
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            const body = buildPayload();
            if (selectedId == null) {
                await createMerchSection(body);
            } else {
                await patchMerchSection(selectedId, body);
            }
            toast.success(selectedId == null ? 'Section created' : 'Section saved');
            onOpenChange(false);
            await onChanged();
        } catch (e) {
            toast.error(merchAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const refreshDetail = async () => {
        if (selectedId == null) return;
        setDetail(await fetchMerchSectionDetail(selectedId));
    };

    const handleAddItem = async () => {
        if (selectedId == null || !newProductId.trim()) return;
        try {
            setAddingItem(true);
            await addSectionItem(selectedId, newProductId.trim(), (detail?.items?.length ?? 0) + 1);
            setNewProductId('');
            await refreshDetail();
            await onChanged();
        } catch (e) {
            toast.error(merchAdminErrorMessage(e));
        } finally {
            setAddingItem(false);
        }
    };

    const handleRemoveItem = async (itemId: number) => {
        try {
            setRemovingId(itemId);
            await deleteSectionItem(itemId);
            await refreshDetail();
            await onChanged();
        } catch (e) {
            toast.error(merchAdminErrorMessage(e));
        } finally {
            setRemovingId(null);
        }
    };

    const patchRule = (patch: Partial<PopulationRulePayload>) => setRule((r) => ({ ...r, ...patch }));

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
                <SheetHeader className="border-b border-border p-4 pr-14">
                    <SheetTitle>{selectedId == null ? 'New section' : 'Edit section'}</SheetTitle>
                    <SheetDescription>
                        {selectedId != null && detail ? <span className="font-mono text-xs">{detail.slug}</span> : 'Title, schedule, product rule and pinned picks for one homepage section.'}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 p-4">
                    {detailLoading ? (
                        <div className="space-y-4" aria-busy="true">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <Tabs value={tab} onValueChange={(v) => setTab(v as SheetTab)}>
                            <TabsList className="w-full">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="rule">Rule</TabsTrigger>
                                <TabsTrigger value="items">Manual picks</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="mt-4 space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="sec-title">Title</Label>
                                    <Input
                                        id="sec-title"
                                        value={title}
                                        placeholder="Trending right now"
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            if (selectedId == null) setSlug(slugify(e.target.value));
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sec-subtitle">Subtitle</Label>
                                    <Input id="sec-subtitle" value={subtitle} placeholder="Optional caption shown under the title" onChange={(e) => setSubtitle(e.target.value)} />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-slug">Slug</Label>
                                        <Input id="sec-slug" className="font-mono text-xs" value={slug} onChange={(e) => setSlug(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-type">Section type</Label>
                                        <Select value={sectionType} onValueChange={setSectionType}>
                                            <SelectTrigger id="sec-type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SECTION_TYPES.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-strategy">Strategy</Label>
                                        <Select value={strategy} onValueChange={setStrategy}>
                                            <SelectTrigger id="sec-strategy">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STRATEGIES.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-max">Max products</Label>
                                        <Input id="sec-max" type="number" min={1} value={maxProducts} onChange={(e) => setMaxProducts(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-position">Position</Label>
                                        <Input id="sec-position" type="number" min={0} value={position} onChange={(e) => setPosition(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-starts">Starts at</Label>
                                        <Input id="sec-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="sec-ends">Ends at</Label>
                                        <Input id="sec-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sec-bg">Background colour</Label>
                                    <ColorSwatchPicker id="sec-bg" value={backgroundColor} presets={BACKGROUND_PRESETS} onChange={setBackgroundColor} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sec-accent">Accent colour</Label>
                                    <ColorSwatchPicker id="sec-accent" value={accentColor} presets={ACCENT_PRESETS} onChange={setAccentColor} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                                        <Label htmlFor="sec-active">Active</Label>
                                        <Switch id="sec-active" checked={isActive} onCheckedChange={setIsActive} />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                                        <Label htmlFor="sec-countdown">
                                            Show countdown <span className="text-xs font-normal text-muted-foreground">(needs end date)</span>
                                        </Label>
                                        <Switch id="sec-countdown" checked={showCountdown} onCheckedChange={setShowCountdown} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="rule" className="mt-4">
                                {strategy === 'manual' ? (
                                    <div className="rounded-md border border-dashed border-border bg-muted px-4 py-6 text-center">
                                        <p className="text-sm text-muted-foreground">
                                            Manual strategy uses only the pinned products from the <strong className="text-foreground">Manual picks</strong> tab. No rule needed.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="rule-type">Rule type</Label>
                                            <Select value={rule.rule_type} onValueChange={(v) => patchRule({ rule_type: v })}>
                                                <SelectTrigger id="rule-type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {RULE_TYPES.map((o) => (
                                                        <SelectItem key={o.value} value={o.value}>
                                                            {o.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="rule-lookback">Lookback (days)</Label>
                                                <Input id="rule-lookback" type="number" min={1} value={rule.lookback_days} onChange={(e) => patchRule({ lookback_days: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="rule-rating">Min rating</Label>
                                                <Input id="rule-rating" type="number" step="0.1" value={rule.min_rating} onChange={(e) => patchRule({ min_rating: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="rule-tag">Tag / keyword filter</Label>
                                            <Input id="rule-tag" value={rule.tag} placeholder="For tag_filter rule" onChange={(e) => patchRule({ tag: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="rule-category">Category (category_best)</Label>
                                            <Select value={rule.category || NO_CATEGORY} onValueChange={(v) => patchRule({ category: v === NO_CATEGORY ? null : v })}>
                                                <SelectTrigger id="rule-category">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NO_CATEGORY}>None</SelectItem>
                                                    {categories.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="rule-lowstock">Low stock threshold</Label>
                                                <Input id="rule-lowstock" type="number" value={rule.low_stock_threshold} onChange={(e) => patchRule({ low_stock_threshold: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="rule-cache">Cache (minutes)</Label>
                                                <Input id="rule-cache" type="number" min={1} value={rule.cache_minutes} onChange={(e) => patchRule({ cache_minutes: Number(e.target.value) })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="rule-minprice">Min price</Label>
                                                <Input id="rule-minprice" type="number" step="0.01" value={rule.min_price ?? ''} onChange={(e) => patchRule({ min_price: e.target.value === '' ? null : e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="rule-maxprice">Max price</Label>
                                                <Input id="rule-maxprice" type="number" step="0.01" value={rule.max_price ?? ''} onChange={(e) => patchRule({ max_price: e.target.value === '' ? null : e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-3 border-t border-border pt-4">
                                            <div className="flex items-center gap-2">
                                                <Checkbox id="rule-instock" checked={rule.only_in_stock} onCheckedChange={(v) => patchRule({ only_in_stock: v === true })} />
                                                <Label htmlFor="rule-instock">Only in stock</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox id="rule-available" checked={rule.only_available} onCheckedChange={(v) => patchRule({ only_available: v === true })} />
                                                <Label htmlFor="rule-available">Only available flag</Label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="items" className="mt-4 space-y-4">
                                {selectedId == null ? (
                                    <div className="flex items-center gap-2 rounded-md bg-warning-subtle px-4 py-3 text-sm text-warning-subtle-foreground">
                                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                                        Save the section first, then add product UUIDs here.
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="item-product">Product UUID</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="item-product"
                                                    className="flex-1 font-mono text-xs"
                                                    value={newProductId}
                                                    placeholder="From product list / Django admin"
                                                    spellCheck={false}
                                                    onChange={(e) => setNewProductId(e.target.value)}
                                                />
                                                <Button type="button" onClick={() => void handleAddItem()} disabled={!newProductId.trim() || addingItem}>
                                                    {addingItem ? <Loader2 className="animate-spin" aria-hidden /> : null}
                                                    Add product
                                                </Button>
                                            </div>
                                        </div>
                                        {(detail?.items?.length ?? 0) === 0 ? (
                                            <div className="rounded-md border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">No pinned items yet.</div>
                                        ) : (
                                            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                                                {(detail?.items ?? []).map((it) => (
                                                    <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">{it.product_name || '(unnamed product)'}</p>
                                                            <code className="block truncate font-mono text-xs text-muted-foreground">{it.product}</code>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon-sm"
                                                            onClick={() => void handleRemoveItem(it.id)}
                                                            disabled={removingId === it.id}
                                                            aria-label={`Remove ${it.product_name || 'pinned product'}`}
                                                        >
                                                            {removingId === it.id ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>

                <SheetFooter className="sticky bottom-0 flex-row justify-end gap-2 border-t border-border bg-background p-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {tab === 'items' ? 'Close' : 'Cancel'}
                    </Button>
                    {tab !== 'items' ? (
                        <Button type="button" onClick={() => void handleSave()} disabled={saving || detailLoading || !title.trim()}>
                            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
                            {saving ? 'Saving…' : 'Save section'}
                        </Button>
                    ) : null}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
