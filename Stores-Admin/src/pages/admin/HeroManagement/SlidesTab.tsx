import { useState } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Switch } from '@/components/shadcn/switch';
import {
    HeroApiError,
    deleteHeroSlide,
    previewBackground,
    reorderHeroSlides,
    updateHeroSlide,
    type HeroConfig,
    type HeroPlacement,
    type HeroSlide,
} from '@/services/heroAdminService';
import { SlideSheet } from './SlideSheet';

function statusOf(slide: HeroSlide): { label: string; variant: 'success' | 'warning' | 'secondary' } {
    if (!slide.is_active) return { label: 'Draft', variant: 'secondary' };
    if (slide.is_live) return { label: 'Live', variant: 'success' };
    return { label: 'Scheduled', variant: 'warning' };
}

interface SlidesTabProps {
    slides: HeroSlide[];
    config: HeroConfig;
    onChange: (slides: HeroSlide[]) => void;
}

export function SlidesTab({ slides, config, onChange }: SlidesTabProps) {
    const [editing, setEditing] = useState<HeroSlide | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [toDelete, setToDelete] = useState<HeroSlide | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const upsert = (saved: HeroSlide) => {
        const exists = slides.some((s) => s.id === saved.id);
        onChange(exists ? slides.map((s) => (s.id === saved.id ? saved : s)) : [...slides, saved]);
    };

    const toggle = async (slide: HeroSlide, active: boolean) => {
        setBusyId(slide.id);
        try {
            upsert(await updateHeroSlide(slide.id, { is_active: active }));
        } catch (e) {
            toast.error(e instanceof HeroApiError ? e.message : 'Could not update the slide.');
        } finally {
            setBusyId(null);
        }
    };

    const move = async (placement: HeroPlacement, index: number, delta: -1 | 1) => {
        const group = slides.filter((s) => s.placement === placement);
        const target = index + delta;
        if (target < 0 || target >= group.length) return;
        const reordered = [...group];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        const others = slides.filter((s) => s.placement !== placement);
        try {
            onChange(await reorderHeroSlides([...others, ...reordered].map((s) => s.id)));
        } catch (e) {
            toast.error(e instanceof HeroApiError ? e.message : 'Could not reorder the slides.');
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setBusyId(toDelete.id);
        try {
            await deleteHeroSlide(toDelete.id);
            onChange(slides.filter((s) => s.id !== toDelete.id));
            toast.success('Slide deleted');
            setToDelete(null);
        } catch (e) {
            toast.error(e instanceof HeroApiError ? e.message : 'Could not delete the slide.');
        } finally {
            setBusyId(null);
        }
    };

    const openNew = () => {
        setEditing(null);
        setSheetOpen(true);
    };

    const renderGroup = (placement: HeroPlacement, title: string, description: string) => {
        const group = slides.filter((s) => s.placement === placement);
        return (
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {group.length === 0 ? (
                        <EmptyState title={`No ${placement === 'main' ? 'main' : 'tile'} slides`} description="The storefront falls back to its default promotion until one is published." />
                    ) : (
                        <ul className="divide-y divide-border">
                            {group.map((slide, i) => {
                                const status = statusOf(slide);
                                const bg = previewBackground(slide.background_style, slide.background_color, slide.gradient_from, slide.gradient_to, slide.gradient_angle);
                                return (
                                    <li key={slide.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <div className="flex w-10 shrink-0 flex-col">
                                                <Button type="button" variant="ghost" size="icon-xs" onClick={() => void move(placement, i, -1)} disabled={i === 0} aria-label={`Move ${slide.name} up`}>
                                                    <ArrowUp />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon-xs" onClick={() => void move(placement, i, 1)} disabled={i === group.length - 1} aria-label={`Move ${slide.name} down`}>
                                                    <ArrowDown />
                                                </Button>
                                            </div>
                                            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border border-border" style={{ background: bg }}>
                                                {slide.image_desktop_url ? (
                                                    <img src={slide.image_desktop_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="flex h-full w-full items-center justify-center" style={{ color: slide.text_color }}>
                                                        <ImageIcon className="h-4 w-4" aria-hidden />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">{slide.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">{slide.title || 'Image only'}</p>
                                                <div className="mt-1">
                                                    <Badge variant={status.variant}>{status.label}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                                            <Switch
                                                checked={slide.is_active}
                                                onCheckedChange={(v) => void toggle(slide, v)}
                                                disabled={busyId === slide.id}
                                                aria-label={`Publish ${slide.name}`}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditing(slide);
                                                        setSheetOpen(true);
                                                    }}
                                                >
                                                    <Pencil /> Edit
                                                </Button>
                                                <Button type="button" variant="destructive" size="icon" onClick={() => setToDelete(slide)} aria-label={`Delete ${slide.name}`}>
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button type="button" onClick={openNew}>
                    <Plus /> Add slide
                </Button>
            </div>
            {renderGroup('main', 'Main banners', 'Rotate in the large banner. Order here is the order buyers see.')}
            {config.layout !== 'carousel'
                ? renderGroup('tile', 'Tiles', config.layout === 'bento' ? 'Up to four tiles beside the main banner.' : 'Up to two tiles stacked beside the carousel.')
                : null}

            <SlideSheet open={sheetOpen} slide={editing} config={config} onOpenChange={setSheetOpen} onSaved={upsert} />

            <Dialog open={toDelete !== null} onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this slide?</DialogTitle>
                        <DialogDescription>
                            {toDelete ? `"${toDelete.name}" will be removed from the home page. This cannot be undone.` : null}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setToDelete(null)} disabled={busyId !== null}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={busyId !== null}>
                            {busyId !== null ? <Loader2 className="animate-spin" aria-hidden /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
