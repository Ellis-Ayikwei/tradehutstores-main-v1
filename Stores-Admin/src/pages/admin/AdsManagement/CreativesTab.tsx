import {
    IconCloudUpload,
    IconCopy,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconEdit,
    IconExternalLink,
    IconPhoto,
    IconPlus,
    IconRefresh,
    IconSparkles,
    IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    ColorSwatchPicker,
    EmptyState,
    Field,
    LivePreview,
    ModalShell,
    TEXT_PRESETS,
    creativeAsPreview,
    inputCls,
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

const CreativesTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<Creative[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [campaignFilter, setCampaignFilter] = useState<string>('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftState>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewVariant, setPreviewVariant] = useState<'banner' | 'topbar' | 'modal'>('banner');

    const desktopRef = useRef<HTMLInputElement>(null);
    const mobileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [creatives, camps] = await Promise.all([
                fetchCreatives(campaignFilter || undefined),
                fetchCampaigns(),
            ]);
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
        return rows.filter(
            (r) => r.name.toLowerCase().includes(s) || r.headline.toLowerCase().includes(s)
        );
    }, [rows, search]);

    const openCreate = () => {
        setEditingId(null);
        setDraft(emptyDraft(campaignFilter));
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
            setError('Campaign and creative name are required.');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            const payload = buildPayload();
            if (editingId) {
                await patchCreative(editingId, payload);
            } else {
                await createCreative(payload);
            }
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row: Creative) => {
        if (!confirm(`Delete creative "${row.name}"?`)) return;
        try {
            await deleteCreative(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
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
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <input
                    placeholder="Search by name or headline…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputCls} max-w-sm`}
                />
                <select
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                    className={`${inputCls} max-w-[260px]`}
                >
                    <option value="">All campaigns</option>
                    {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <IconRefresh size={16} /> Refresh
                </button>
                <button
                    type="button"
                    onClick={openCreate}
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow"
                >
                    <IconPlus size={16} /> New creative
                </button>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant">Loading creatives…</div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<IconPhoto size={26} />}
                    title="No creatives yet"
                    body="A creative is the visual + copy + CTA. Make one and assign it to a campaign — you can reuse it across many placements."
                    action={
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                        >
                            <IconPlus size={16} /> Create your first creative
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((row) => (
                        <div
                            key={row.id}
                            className="group rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            {/* Live preview tile */}
                            <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <LivePreview creative={creativeAsPreview(row)} variant="banner" />
                            </div>

                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-sm text-on-surface dark:text-white truncate">
                                            {row.name}
                                        </h3>
                                        <p className="text-xs text-on-surface-variant truncate flex items-center gap-1">
                                            <IconSparkles size={11} />
                                            {row.campaign_name}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(row)}
                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                            title="Edit"
                                        >
                                            <IconEdit size={15} />
                                        </button>
                                        <button
                                            onClick={() => duplicate(row)}
                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                            title="Duplicate"
                                        >
                                            <IconCopy size={15} />
                                        </button>
                                        <button
                                            onClick={() => remove(row)}
                                            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                                            title="Delete"
                                        >
                                            <IconTrash size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                                    <Chip>{row.format}</Chip>
                                    {row.image_desktop_url && (
                                        <Chip>
                                            <IconDeviceDesktop size={10} className="inline mr-0.5" />
                                            desktop
                                        </Chip>
                                    )}
                                    {row.image_mobile_url && (
                                        <Chip>
                                            <IconDeviceMobile size={10} className="inline mr-0.5" />
                                            mobile
                                        </Chip>
                                    )}
                                    {row.cta_url && (
                                        <Chip tone="primary">
                                            <IconExternalLink size={10} className="inline mr-0.5" />
                                            {row.cta_label || 'CTA'}
                                        </Chip>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Editor modal ──────────────────────────────────────────── */}
            {open && (
                <ModalShell
                    title={editingId ? 'Edit creative' : 'New creative'}
                    icon={
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <IconPhoto size={18} />
                        </span>
                    }
                    onClose={() => setOpen(false)}
                    onSave={save}
                    saving={saving}
                    saveLabel={editingId ? 'Save changes' : 'Create creative'}
                    width="xl"
                >
                    <div className="grid lg:grid-cols-[1fr,360px] gap-0 lg:divide-x divide-gray-200 dark:divide-gray-800">
                        {/* Left: form */}
                        <div className="p-6 space-y-5">
                            {error && <Alert>{error}</Alert>}

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Campaign *">
                                    <select
                                        className={inputCls}
                                        value={draft.campaign}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, campaign: e.target.value }))
                                        }
                                    >
                                        <option value="">— Select campaign —</option>
                                        {campaigns.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Format">
                                    <select
                                        className={inputCls}
                                        value={draft.format}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                format: e.target.value as DraftState['format'],
                                            }))
                                        }
                                    >
                                        {CREATIVE_FORMATS.map((f) => (
                                            <option key={f.value} value={f.value}>
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <Field label="Internal name *" hint="Only shown in admin. e.g. 'BF26 – top bar – orange'">
                                <input
                                    className={inputCls}
                                    value={draft.name}
                                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                    placeholder="Black Friday — top bar — orange variant"
                                />
                            </Field>

                            {/* Media */}
                            <div className="grid grid-cols-2 gap-3">
                                <DropZone
                                    label="Desktop image"
                                    hint="Recommended ≥ 1600 × 400"
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

                            {draft.format === 'video' && (
                                <Field label="Video URL">
                                    <input
                                        className={inputCls}
                                        value={draft.video_url}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, video_url: e.target.value }))
                                        }
                                        placeholder="https://…"
                                    />
                                </Field>
                            )}
                            {draft.format === 'html' && (
                                <Field label="HTML body" hint="Will be sanitized on render">
                                    <textarea
                                        className={`${inputCls} font-mono text-xs`}
                                        rows={6}
                                        value={draft.html_body}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, html_body: e.target.value }))
                                        }
                                    />
                                </Field>
                            )}

                            {/* Copy */}
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                                <div className="flex items-center gap-2 mb-1">
                                    <IconSparkles size={14} className="text-primary" />
                                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                        Copy
                                    </p>
                                </div>
                                <Field label="Eyebrow" hint="Tiny label above the headline (optional)">
                                    <input
                                        className={inputCls}
                                        value={draft.eyebrow}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, eyebrow: e.target.value }))
                                        }
                                        placeholder="LIMITED · 48 HOURS"
                                    />
                                </Field>
                                <Field label="Headline">
                                    <input
                                        className={inputCls}
                                        value={draft.headline}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, headline: e.target.value }))
                                        }
                                        placeholder="50% off premium collections"
                                    />
                                </Field>
                                <Field label="Sub-headline">
                                    <input
                                        className={inputCls}
                                        value={draft.subheadline}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, subheadline: e.target.value }))
                                        }
                                        placeholder="Check back at midnight for fresh drops"
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="CTA label">
                                        <input
                                            className={inputCls}
                                            value={draft.cta_label}
                                            onChange={(e) =>
                                                setDraft((d) => ({ ...d, cta_label: e.target.value }))
                                            }
                                            placeholder="Shop now"
                                        />
                                    </Field>
                                    <Field label="CTA URL">
                                        <input
                                            className={inputCls}
                                            value={draft.cta_url}
                                            onChange={(e) =>
                                                setDraft((d) => ({ ...d, cta_url: e.target.value }))
                                            }
                                            placeholder="/deals"
                                        />
                                    </Field>
                                </div>
                                <Field label="Alt text" hint="Read by screen readers when image fails">
                                    <input
                                        className={inputCls}
                                        value={draft.alt_text}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, alt_text: e.target.value }))
                                        }
                                    />
                                </Field>
                                <label className="flex items-center gap-2 text-sm text-on-surface dark:text-gray-200">
                                    <input
                                        type="checkbox"
                                        checked={draft.open_in_new_tab}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, open_in_new_tab: e.target.checked }))
                                        }
                                    />
                                    Open CTA in a new tab
                                </label>
                            </div>

                            {/* Styling */}
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 bg-gray-50/40 dark:bg-gray-800/30">
                                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                    Styling
                                </p>
                                <Field label="Background" hint="Solid hex or full CSS gradient">
                                    <ColorSwatchPicker
                                        value={draft.background_color}
                                        presets={BACKGROUND_PRESETS}
                                        onChange={(v) => setDraft((d) => ({ ...d, background_color: v }))}
                                    />
                                </Field>
                                <Field label="Text color">
                                    <ColorSwatchPicker
                                        value={draft.text_color}
                                        presets={TEXT_PRESETS}
                                        onChange={(v) => setDraft((d) => ({ ...d, text_color: v }))}
                                    />
                                </Field>
                                <Field label="Accent (CTA + eyebrow)">
                                    <ColorSwatchPicker
                                        value={draft.accent_color}
                                        presets={ACCENT_PRESETS}
                                        onChange={(v) => setDraft((d) => ({ ...d, accent_color: v }))}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Right: live preview */}
                        <div className="lg:sticky lg:top-0 lg:self-start p-6 bg-gray-50/60 dark:bg-gray-950/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                                    Live preview
                                </p>
                                <div className="flex gap-1 p-0.5 rounded-lg bg-gray-200 dark:bg-gray-800">
                                    {(['banner', 'topbar', 'modal'] as const).map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setPreviewVariant(v)}
                                            className={[
                                                'px-2 py-1 text-[11px] font-bold rounded-md capitalize',
                                                previewVariant === v
                                                    ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
                                                    : 'text-on-surface-variant',
                                            ].join(' ')}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
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
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">
                                The storefront renders this creative responsively — desktop image on md+, mobile
                                image otherwise. Switch the preview tabs above to see how it looks in different
                                placement formats.
                            </p>
                        </div>
                    </div>
                </ModalShell>
            )}
        </div>
    );
};

const Chip: React.FC<{ tone?: 'default' | 'primary'; children: React.ReactNode }> = ({
    tone = 'default',
    children,
}) => (
    <span
        className={[
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
            tone === 'primary'
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 dark:bg-gray-800 text-on-surface-variant',
        ].join(' ')}
    >
        {children}
    </span>
);

const DropZone: React.FC<{
    label: string;
    hint?: string;
    preview: string | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onPick: (file: File) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ label, hint, preview, inputRef, onPick, onDrop }) => {
    const [hover, setHover] = useState(false);
    return (
        <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-500 mb-1.5">
                {label}
            </label>
            <div
                className={[
                    'relative aspect-[16/6] rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-all',
                    hover
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary/60',
                ].join(' ')}
                onClick={() => inputRef.current?.click()}
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="preview" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-semibold opacity-0 hover:opacity-100 transition">
                            Click to replace
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-on-surface-variant gap-1.5">
                        <IconCloudUpload size={22} className="text-primary" />
                        <span className="font-semibold">Drop or click to upload</span>
                        {hint && <span className="text-[10px]">{hint}</span>}
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
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
