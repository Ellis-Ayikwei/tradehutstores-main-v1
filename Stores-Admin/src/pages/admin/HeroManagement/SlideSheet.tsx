import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { Switch } from '@/components/shadcn/switch';
import {
    HeroApiError,
    createHeroSlide,
    updateHeroSlide,
    type HeroPlacement,
    type HeroSlide,
    type HeroSlideDraft,
    type HeroTextAlign,
} from '@/services/heroAdminService';
import { ColorField, isHex } from './ColorField';
import { HeroPreview } from './HeroPreview';
import type { HeroConfig } from '@/services/heroAdminService';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EMPTY: HeroSlideDraft = {
    name: '',
    placement: 'main',
    is_active: true,
    starts_at: null,
    ends_at: null,
    image_desktop: undefined,
    image_mobile: undefined,
    alt_text: '',
    eyebrow: '',
    title: '',
    subtitle: '',
    cta_label: '',
    link_url: '',
    open_in_new_tab: false,
    text_color: '#ffffff',
    text_align: 'left',
    overlay_strength: 40,
    background_style: 'solid',
    background_color: '#18181b',
    gradient_from: '#18181b',
    gradient_to: '#8c2e06',
    gradient_angle: 135,
};

function fromSlide(slide: HeroSlide): HeroSlideDraft {
    return {
        name: slide.name,
        placement: slide.placement,
        is_active: slide.is_active,
        starts_at: slide.starts_at,
        ends_at: slide.ends_at,
        image_desktop: undefined,
        image_mobile: undefined,
        alt_text: slide.alt_text,
        eyebrow: slide.eyebrow,
        title: slide.title,
        subtitle: slide.subtitle,
        cta_label: slide.cta_label,
        link_url: slide.link_url,
        open_in_new_tab: slide.open_in_new_tab,
        text_color: slide.text_color,
        text_align: slide.text_align,
        overlay_strength: slide.overlay_strength,
        background_style: slide.background_style,
        background_color: slide.background_color,
        gradient_from: slide.gradient_from || '#18181b',
        gradient_to: slide.gradient_to || '#8c2e06',
        gradient_angle: slide.gradient_angle,
    };
}

/** ISO <-> value of <input type="datetime-local"> (local time, minute precision). */
const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

interface ImageFieldProps {
    id: string;
    label: string;
    hint: string;
    savedUrl: string | null;
    value: File | null | undefined;
    onChange: (file: File | null | undefined) => void;
}

function ImageField({ id, label, hint, savedUrl, value, onChange }: ImageFieldProps) {
    const input = useRef<HTMLInputElement>(null);
    const objectUrl = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
    useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

    // undefined = untouched (keep saved), null = removed, File = replacement.
    const shown = value === null ? null : (objectUrl ?? savedUrl);

    const pick = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Choose an image file.');
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error('Image is larger than 5 MB.');
            return;
        }
        onChange(file);
    };

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-3">
                <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
                        {shown ? 'Replace' : 'Upload'}
                    </Button>
                    {shown ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                            Remove
                        </Button>
                    ) : null}
                </div>
                <input
                    ref={input}
                    id={id}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                        pick(e.target.files?.[0]);
                        e.target.value = '';
                    }}
                />
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

interface SlideSheetProps {
    open: boolean;
    slide: HeroSlide | null;
    config: HeroConfig;
    onOpenChange: (open: boolean) => void;
    onSaved: (slide: HeroSlide) => void;
}

export function SlideSheet({ open, slide, config, onOpenChange, onSaved }: SlideSheetProps) {
    const [draft, setDraft] = useState<HeroSlideDraft>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) return;
        setDraft(slide ? fromSlide(slide) : EMPTY);
        setErrors({});
    }, [open, slide]);

    const set = <K extends keyof HeroSlideDraft>(key: K, value: HeroSlideDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

    const previewImage = useMemo(
        () => (draft.image_desktop instanceof File ? URL.createObjectURL(draft.image_desktop) : draft.image_desktop === null ? null : (slide?.image_desktop_url ?? null)),
        [draft.image_desktop, slide]
    );
    useEffect(() => () => { if (previewImage?.startsWith('blob:')) URL.revokeObjectURL(previewImage); }, [previewImage]);

    const validate = (): Record<string, string> => {
        const next: Record<string, string> = {};
        if (!draft.name.trim()) next.name = 'Give the slide an internal name.';
        const hasImage = draft.image_desktop instanceof File || (draft.image_desktop !== null && Boolean(slide?.image_desktop_url));
        if (!hasImage && !draft.title.trim()) next.title = 'Add a headline or an image.';
        if (draft.link_url && !/^(\/(?!\/)|https?:\/\/)/.test(draft.link_url)) next.link_url = 'Use a path like /deals or a full http(s) link.';
        if (draft.cta_label && !draft.link_url) next.link_url = 'A button needs a link.';
        if (!isHex(draft.text_color)) next.text_color = 'Use a hex colour.';
        if (draft.background_style === 'solid' && !isHex(draft.background_color)) next.background_color = 'Use a hex colour.';
        if (draft.background_style === 'gradient' && !(isHex(draft.gradient_from) && isHex(draft.gradient_to))) next.gradient_from = 'Pick both colours.';
        if (draft.starts_at && draft.ends_at && new Date(draft.ends_at) <= new Date(draft.starts_at)) next.ends_at = 'End must be after start.';
        return next;
    };

    const save = async () => {
        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        setSaving(true);
        try {
            const saved = slide ? await updateHeroSlide(slide.id, draft) : await createHeroSlide(config.id, draft);
            toast.success(slide ? 'Slide saved' : 'Slide added');
            onSaved(saved);
            onOpenChange(false);
        } catch (e) {
            const err = e instanceof HeroApiError ? e : new HeroApiError('Could not save the slide.');
            setErrors(err.fields);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const preview = {
        id: 'draft',
        placement: draft.placement,
        image_desktop_url: previewImage,
        eyebrow: draft.eyebrow,
        title: draft.title,
        text_color: isHex(draft.text_color) ? draft.text_color : '#ffffff',
        text_align: draft.text_align,
        overlay_strength: draft.overlay_strength,
        background_style: draft.background_style,
        background_color: draft.background_color,
        gradient_from: draft.gradient_from,
        gradient_to: draft.gradient_to,
        gradient_angle: draft.gradient_angle,
    };

    const field = (id: string, label: string, key: 'name' | 'eyebrow' | 'title' | 'subtitle' | 'cta_label' | 'link_url' | 'alt_text', props: { maxLength: number; placeholder?: string }) => (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} value={draft[key]} onChange={(e) => set(key, e.target.value)} aria-invalid={Boolean(errors[key])} {...props} />
            {errors[key] ? <p className="text-xs text-destructive-subtle-foreground">{errors[key]}</p> : null}
        </div>
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
                <SheetHeader className="border-b border-border p-4">
                    <SheetTitle>{slide ? 'Edit slide' : 'Add slide'}</SheetTitle>
                    <SheetDescription>Images, text, link and background for one banner.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-6 p-4">
                    <HeroPreview config={config} slides={[preview]} />

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Basics</h3>
                        {field('slide-name', 'Internal name', 'name', { maxLength: 120, placeholder: 'Black Friday main banner' })}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="slide-placement">Position in layout</Label>
                                <Select value={draft.placement} onValueChange={(v) => set('placement', v as HeroPlacement)}>
                                    <SelectTrigger id="slide-placement">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="main">Main banner</SelectItem>
                                        <SelectItem value="tile">Tile</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end justify-between gap-3 rounded-md border border-border px-3 py-2">
                                <Label htmlFor="slide-active" className="pb-1">Published</Label>
                                <Switch id="slide-active" checked={draft.is_active} onCheckedChange={(v) => set('is_active', v)} />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Images</h3>
                        <ImageField id="slide-img-desktop" label="Desktop image" hint="Wide, about 1600 x 700. JPG, PNG or WebP up to 5 MB." savedUrl={slide?.image_desktop_url ?? null} value={draft.image_desktop} onChange={(f) => set('image_desktop', f)} />
                        <ImageField id="slide-img-mobile" label="Mobile image (optional)" hint="Taller crop, about 800 x 450. Falls back to the desktop image." savedUrl={slide?.image_mobile_url ?? null} value={draft.image_mobile} onChange={(f) => set('image_mobile', f)} />
                        {field('slide-alt', 'Image description', 'alt_text', { maxLength: 240, placeholder: 'For screen readers' })}
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Text and link</h3>
                        {field('slide-eyebrow', 'Small label', 'eyebrow', { maxLength: 60 })}
                        {field('slide-title', 'Headline', 'title', { maxLength: 120 })}
                        {field('slide-subtitle', 'Supporting text', 'subtitle', { maxLength: 240 })}
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('slide-cta', 'Button label', 'cta_label', { maxLength: 40 })}
                            {field('slide-link', 'Link', 'link_url', { maxLength: 500, placeholder: '/deals' })}
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                            <Label htmlFor="slide-newtab">Open link in a new tab</Label>
                            <Switch id="slide-newtab" checked={draft.open_in_new_tab} onCheckedChange={(v) => set('open_in_new_tab', v)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <ColorField id="slide-text-color" label="Text colour" value={draft.text_color} onChange={(v) => set('text_color', v)} error={errors.text_color} />
                            <div className="space-y-1.5">
                                <Label htmlFor="slide-align">Text alignment</Label>
                                <Select value={draft.text_align} onValueChange={(v) => set('text_align', v as HeroTextAlign)}>
                                    <SelectTrigger id="slide-align">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Left</SelectItem>
                                        <SelectItem value="center">Centre</SelectItem>
                                        <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="slide-overlay">Image darkening ({draft.overlay_strength}%)</Label>
                            <input
                                id="slide-overlay"
                                type="range"
                                min={0}
                                max={80}
                                step={5}
                                value={draft.overlay_strength}
                                onChange={(e) => set('overlay_strength', Number(e.target.value))}
                                className="h-9 w-full accent-primary"
                            />
                            <p className="text-xs text-muted-foreground">Keeps text readable over a photo. Ignored when there is no image.</p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Background</h3>
                        <p className="text-xs text-muted-foreground">Used when there is no image, and behind transparent images.</p>
                        <div className="max-w-xs space-y-1.5">
                            <Label htmlFor="slide-bg-style">Style</Label>
                            <Select value={draft.background_style} onValueChange={(v) => set('background_style', v as 'solid' | 'gradient')}>
                                <SelectTrigger id="slide-bg-style">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="solid">Solid colour</SelectItem>
                                    <SelectItem value="gradient">Gradient</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {draft.background_style === 'solid' ? (
                            <div className="max-w-xs">
                                <ColorField id="slide-bg-color" label="Colour" value={draft.background_color} onChange={(v) => set('background_color', v)} error={errors.background_color} />
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <ColorField id="slide-grad-from" label="From" value={draft.gradient_from} onChange={(v) => set('gradient_from', v)} error={errors.gradient_from} />
                                <ColorField id="slide-grad-to" label="To" value={draft.gradient_to} onChange={(v) => set('gradient_to', v)} />
                                <div className="space-y-1.5">
                                    <Label htmlFor="slide-grad-angle">Angle ({draft.gradient_angle} deg)</Label>
                                    <input
                                        id="slide-grad-angle"
                                        type="range"
                                        min={0}
                                        max={360}
                                        step={5}
                                        value={draft.gradient_angle}
                                        onChange={(e) => set('gradient_angle', Number(e.target.value))}
                                        className="h-9 w-full accent-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground">Schedule (optional)</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="slide-starts">Show from</Label>
                                <Input id="slide-starts" type="datetime-local" value={toLocalInput(draft.starts_at)} onChange={(e) => set('starts_at', fromLocalInput(e.target.value))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="slide-ends">Show until</Label>
                                <Input id="slide-ends" type="datetime-local" value={toLocalInput(draft.ends_at)} onChange={(e) => set('ends_at', fromLocalInput(e.target.value))} aria-invalid={Boolean(errors.ends_at)} />
                                {errors.ends_at ? <p className="text-xs text-destructive-subtle-foreground">{errors.ends_at}</p> : null}
                            </div>
                        </div>
                    </section>
                </div>

                <SheetFooter className="sticky bottom-0 flex-row justify-end gap-2 border-t border-border bg-background p-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={() => void save()} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
                        {slide ? 'Save slide' : 'Add slide'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
