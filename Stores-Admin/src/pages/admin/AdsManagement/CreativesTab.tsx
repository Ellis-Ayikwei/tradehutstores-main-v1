import { CloudUpload, Copy, ExternalLink, Image as ImageIcon, Monitor, Pencil, Plus, RefreshCw, Smartphone, Sparkles, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Switch } from '@/components/shadcn/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';
import {
    CREATIVE_FORMATS,
    Campaign,
    Creative,
    CreativeWritePayload,
    adsAdminErrorMessage,
    createCreative,
    deleteCreative,
    fetchCampaigns,
    fetchCreatives,
    patchCreative,
} from '../../../services/adsAdminService';
import {
    ACCENT_PRESETS,
    Alert,
    BACKGROUND_PRESETS,
    CardGridSkeleton,
    CheckRow,
    ColorSwatchPicker,
    ConfirmDialog,
    EmptyState,
    Field,
    FormSection,
    FormSheet,
    LivePreview,
    SimpleSelect,
    TEXT_PRESETS,
    Toolbar,
    creativeAsPreview,
} from './_shared';

interface DraftState {
    campaign: string;
    name: string;
    format: 'image' | 'video' | 'html' | 'text';
    image_desktop_file: File | null;
    image_mobile_file: File | null;
    image_desktop_preview: string | null;
    image_mobile_preview: string | null;
    video_url: string;
    html_body: string;
    headline: string;
    subheadline: string;
    eyebrow: string;
    cta_label: string;
    cta_url: string;
    open_in_new_tab: boolean;
    background_color: string;
    text_color: string;
    accent_color: string;
    alt_text: string;
}

function emptyDraft(campaignId = ''): DraftState {
    return {
        campaign: campaignId,
        name: '',
        format: 'image',
        image_desktop_file: null,
        image_mobile_file: null,
        image_desktop_preview: null,
        image_mobile_preview: null,
        video_url: '',
        html_body: '',
        headline: '',
        subheadline: '',
        eyebrow: '',
        cta_label: '',
        cta_url: '',
        open_in_new_tab: false,
        background_color: '#0f172a',
        text_color: '#ffffff',
        accent_color: '#fbbf24',
        alt_text: '',
    };
}

interface Props {
    onChange?: () => void;
}

const ALL = '';

const CreativesTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<Creative[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [campaignFilter, setCampaignFilter] = useState<string>(ALL);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftState>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewVariant, setPreviewVariant] = useState<'banner' | 'topbar' | 'modal'>('banner');

    const [toDelete, setToDelete] = useState<Creative | null>(null);
    const [deleting, setDeleting] = useState(false);

    const desktopRef = useRef<HTMLInputElement>(null);
    const mobileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [creatives, camps] = await Promise.all([fetchCreatives(campaignFilter || undefined), fetchCampaigns()]);
            setRows(creatives);
            setCampaigns(camps);
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [campaignFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return rows;
        return rows.filter((r) => r.name.toLowerCase().includes(s) || r.headline.toLowerCase().includes(s));
    }, [rows, search]);

    const campaignOptions = useMemo(() => campaigns.map((c) => ({ value: c.id, label: c.name })), [campaigns]);

    const openCreate = () => {
        setEditingId(null);
        setDraft(emptyDraft(campaignFilter));
        setFormError(null);
        setOpen(true);
    };

    const openEdit = (row: Creative) => {
        setEditingId(row.id);
        setDraft({
            campaign: row.campaign,
            name: row.name,
            format: row.format,
            image_desktop_file: null,
            image_mobile_file: null,
            image_desktop_preview: row.image_desktop_url,
            image_mobile_preview: row.image_mobile_url,
            video_url: row.video_url,
            html_body: row.html_body,
            headline: row.headline,
            subheadline: row.subheadline,
            eyebrow: row.eyebrow,
            cta_label: row.cta_label,
            cta_url: row.cta_url,
            open_in_new_tab: row.open_in_new_tab,
            background_color: row.background_color,
            text_color: row.text_color,
            accent_color: row.accent_color,
            alt_text: row.alt_text,
        });
        setFormError(null);
        setOpen(true);
    };

    const onPickFile = (which: 'desktop' | 'mobile', file: File | null) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setDraft((d) => ({
            ...d,
            [which === 'desktop' ? 'image_desktop_file' : 'image_mobile_file']: file,
            [which === 'desktop' ? 'image_desktop_preview' : 'image_mobile_preview']: url,
        }));
    };

    const onDrop = (which: 'desktop' | 'mobile', e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) onPickFile(which, file);
    };

    const buildPayload = (): CreativeWritePayload => ({
        campaign: draft.campaign,
        name: draft.name,
        format: draft.format,
        image_desktop: draft.image_desktop_file ?? undefined,
        image_mobile: draft.image_mobile_file ?? undefined,
        video_url: draft.video_url,
        html_body: draft.html_body,
        headline: draft.headline,
        subheadline: draft.subheadline,
        eyebrow: draft.eyebrow,
        cta_label: draft.cta_label,
        cta_url: draft.cta_url,
        open_in_new_tab: draft.open_in_new_tab,
        background_color: draft.background_color,
        text_color: draft.text_color,
        accent_color: draft.accent_color,
        alt_text: draft.alt_text,
    });

    const save = async () => {
        if (!draft.campaign || !draft.name.trim()) {
            setFormError('Campaign and creative name are required.');
            return;
        }
        try {
            setSaving(true);
            setFormError(null);
            const payload = buildPayload();
            if (editingId) {
                await patchCreative(editingId, payload);
            } else {
                await createCreative(payload);
            }
            toast.success(editingId ? 'Creative saved' : 'Creative created');
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setFormError(adsAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const confirmRemove = async () => {
        if (!toDelete) return;
        try {
            setDeleting(true);
            await deleteCreative(toDelete.id);
            toast.success('Creative deleted');
            setToDelete(null);
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const duplicate = async (row: Creative) => {
        try {
            await createCreative({
                campaign: row.campaign,
                name: `${row.name} (copy)`,
                format: row.format,
                video_url: row.video_url,
                html_body: row.html_body,
                headline: row.headline,
                subheadline: row.subheadline,
                eyebrow: row.eyebrow,
                cta_label: row.cta_label,
                cta_url: row.cta_url,
                open_in_new_tab: row.open_in_new_tab,
                background_color: row.background_color,
                text_color: row.text_color,
                accent_color: row.accent_color,
                alt_text: row.alt_text,
            });
            toast.success('Creative duplicated');
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        }
    };

    const setField = <K extends keyof DraftState>(key: K, value: DraftState[K]) => setDraft((d) => ({ ...d, [key]: value }));

    return (
        <div className="space-y-4">
            <Toolbar>
                <Input placeholder="Search by name or headline…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-sm" aria-label="Search creatives" />
                <SimpleSelect
                    value={campaignFilter}
                    onChange={setCampaignFilter}
                    options={[{ value: ALL, label: 'All campaigns' }, ...campaignOptions]}
                    className="sm:w-64"
                />
                <div className="flex gap-2 sm:ml-auto">
                    <Button type="button" variant="outline" onClick={load} className="flex-1 sm:flex-none">
                        <RefreshCw /> Refresh
                    </Button>
                    <Button type="button" onClick={openCreate} className="flex-1 sm:flex-none">
                        <Plus /> New creative
                    </Button>
                </div>
            </Toolbar>

            {error ? <Alert onRetry={load}>{error}</Alert> : null}

            {loading ? (
                <CardGridSkeleton />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={ImageIcon}
                    title={rows.length === 0 ? 'No creatives yet' : 'No creatives match'}
                    body={
                        rows.length === 0
                            ? 'A creative is the visual, copy and CTA. Make one and assign it to a campaign. You can reuse it across many placements.'
                            : 'Try a different search or campaign filter.'
                    }
                    action={
                        rows.length === 0 ? (
                            <Button type="button" onClick={openCreate}>
                                <Plus /> Create your first creative
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((row) => (
                        <Card key={row.id}>
                            <div className="bg-muted p-3">
                                <LivePreview creative={creativeAsPreview(row)} variant="banner" />
                            </div>

                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-semibold text-foreground">{row.name}</h3>
                                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                                            <span className="truncate">{row.campaign_name}</span>
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
                                            <Pencil />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => duplicate(row)} aria-label={`Duplicate ${row.name}`}>
                                            <Copy />
                                        </Button>
                                        <Button type="button" variant="destructive" size="icon-sm" onClick={() => setToDelete(row)} aria-label={`Delete ${row.name}`}>
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <Badge variant="secondary" className="capitalize">
                                        {row.format}
                                    </Badge>
                                    {row.image_desktop_url ? (
                                        <Badge variant="secondary">
                                            <Monitor aria-hidden /> desktop
                                        </Badge>
                                    ) : null}
                                    {row.image_mobile_url ? (
                                        <Badge variant="secondary">
                                            <Smartphone aria-hidden /> mobile
                                        </Badge>
                                    ) : null}
                                    {row.cta_url ? (
                                        <Badge variant="info">
                                            <ExternalLink aria-hidden /> {row.cta_label || 'CTA'}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <FormSheet
                open={open}
                title={editingId ? 'Edit creative' : 'New creative'}
                description="Visual, copy and styling for an ad."
                onClose={() => setOpen(false)}
                onSave={save}
                saving={saving}
                saveLabel={editingId ? 'Save changes' : 'Create creative'}
                width="xl"
            >
                <div className="grid lg:grid-cols-[1fr,360px]">
                    {/* Form */}
                    <div className="space-y-5 p-4">
                        {formError ? <Alert>{formError}</Alert> : null}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Campaign *">
                                <SimpleSelect value={draft.campaign} onChange={(v) => setField('campaign', v)} options={campaignOptions} placeholder="Select campaign" />
                            </Field>
                            <Field label="Format">
                                <SimpleSelect value={draft.format} onChange={(v) => setField('format', v as DraftState['format'])} options={CREATIVE_FORMATS} />
                            </Field>
                        </div>

                        <Field label="Internal name *" hint="Only shown in admin.">
                            <Input value={draft.name} onChange={(e) => setField('name', e.target.value)} placeholder="Black Friday, top bar, orange variant" />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DropZone
                                label="Desktop image"
                                hint="Recommended 1600 x 400 or wider"
                                preview={draft.image_desktop_preview}
                                inputRef={desktopRef}
                                onPick={(f) => onPickFile('desktop', f)}
                                onDrop={(e) => onDrop('desktop', e)}
                            />
                            <DropZone
                                label="Mobile image (optional)"
                                hint="Falls back to desktop if missing"
                                preview={draft.image_mobile_preview}
                                inputRef={mobileRef}
                                onPick={(f) => onPickFile('mobile', f)}
                                onDrop={(e) => onDrop('mobile', e)}
                            />
                        </div>

                        {draft.format === 'video' ? (
                            <Field label="Video URL">
                                <Input value={draft.video_url} onChange={(e) => setField('video_url', e.target.value)} placeholder="https://…" />
                            </Field>
                        ) : null}
                        {draft.format === 'html' ? (
                            <Field label="HTML body" hint="Will be sanitized on render">
                                <Textarea className="font-mono text-xs" rows={6} value={draft.html_body} onChange={(e) => setField('html_body', e.target.value)} />
                            </Field>
                        ) : null}

                        <FormSection title="Copy" icon={Sparkles}>
                            <Field label="Eyebrow" hint="Tiny label above the headline (optional)">
                                <Input value={draft.eyebrow} onChange={(e) => setField('eyebrow', e.target.value)} placeholder="Limited, 48 hours" />
                            </Field>
                            <Field label="Headline">
                                <Input value={draft.headline} onChange={(e) => setField('headline', e.target.value)} placeholder="50% off premium collections" />
                            </Field>
                            <Field label="Sub-headline">
                                <Input value={draft.subheadline} onChange={(e) => setField('subheadline', e.target.value)} placeholder="Check back at midnight for fresh drops" />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="CTA label">
                                    <Input value={draft.cta_label} onChange={(e) => setField('cta_label', e.target.value)} placeholder="Shop now" />
                                </Field>
                                <Field label="CTA URL">
                                    <Input value={draft.cta_url} onChange={(e) => setField('cta_url', e.target.value)} placeholder="/deals" />
                                </Field>
                            </div>
                            <Field label="Alt text" hint="Read by screen readers when the image fails">
                                <Input value={draft.alt_text} onChange={(e) => setField('alt_text', e.target.value)} />
                            </Field>
                            <CheckRow id="creative-newtab" label="Open CTA in a new tab">
                                <Switch id="creative-newtab" checked={draft.open_in_new_tab} onCheckedChange={(v) => setField('open_in_new_tab', v)} />
                            </CheckRow>
                        </FormSection>

                        <FormSection title="Styling">
                            <Field label="Background" hint="Solid hex or full CSS gradient">
                                <ColorSwatchPicker value={draft.background_color} presets={BACKGROUND_PRESETS} onChange={(v) => setField('background_color', v)} />
                            </Field>
                            <Field label="Text colour">
                                <ColorSwatchPicker value={draft.text_color} presets={TEXT_PRESETS} onChange={(v) => setField('text_color', v)} />
                            </Field>
                            <Field label="Accent (CTA + eyebrow)">
                                <ColorSwatchPicker value={draft.accent_color} presets={ACCENT_PRESETS} onChange={(v) => setField('accent_color', v)} />
                            </Field>
                        </FormSection>
                    </div>

                    {/* Live preview: below the form on mobile, sticky column on lg */}
                    <div className="space-y-3 border-t border-border bg-muted p-4 lg:sticky lg:top-0 lg:self-start lg:border-l lg:border-t-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">Live preview</p>
                            <Tabs value={previewVariant} onValueChange={(v) => setPreviewVariant(v as typeof previewVariant)}>
                                <TabsList className="bg-background">
                                    {(['banner', 'topbar', 'modal'] as const).map((v) => (
                                        <TabsTrigger key={v} value={v} className="px-2.5 text-xs capitalize">
                                            {v}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                        <LivePreview
                            creative={{
                                eyebrow: draft.eyebrow,
                                headline: draft.headline || '(your headline shows here)',
                                subheadline: draft.subheadline,
                                cta_label: draft.cta_label,
                                background_color: draft.background_color,
                                text_color: draft.text_color,
                                accent_color: draft.accent_color,
                                image_desktop_preview: draft.image_desktop_preview,
                            }}
                            variant={previewVariant}
                        />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            The storefront renders this creative responsively: desktop image on md and up, mobile image otherwise. Switch the preview tabs to see how it looks in different placement formats.
                        </p>
                    </div>
                </div>
            </FormSheet>

            <ConfirmDialog
                open={toDelete !== null}
                title="Delete this creative?"
                description={toDelete ? `"${toDelete.name}" will be deleted. This cannot be undone.` : undefined}
                busy={deleting}
                onConfirm={confirmRemove}
                onCancel={() => setToDelete(null)}
            />
        </div>
    );
};

const DropZone: React.FC<{
    label: string;
    hint?: string;
    preview: string | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onPick: (file: File) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ label, hint, preview, inputRef, onPick, onDrop }) => {
    const [hover, setHover] = useState(false);
    const id = React.useId();
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div
                role="button"
                tabIndex={0}
                aria-label={`${label}: ${preview ? 'click to replace' : 'drop or click to upload'}`}
                className={cn(
                    'relative aspect-[16/6] cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-muted transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-subtle',
                    hover ? 'border-primary bg-primary-subtle' : 'border-border hover:border-primary'
                )}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setHover(true);
                }}
                onDragLeave={() => setHover(false)}
                onDrop={(e) => {
                    setHover(false);
                    onDrop(e);
                }}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                        <span className="absolute bottom-2 right-2 rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background">Click to replace</span>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <CloudUpload className="h-5 w-5 text-primary" aria-hidden />
                        <span className="font-medium">Drop or click to upload</span>
                        {hint ? <span className="text-[11px]">{hint}</span> : null}
                    </div>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPick(f);
                    }}
                />
            </div>
        </div>
    );
};

export default CreativesTab;
