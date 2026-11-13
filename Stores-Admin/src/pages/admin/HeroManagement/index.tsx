import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import {
    HeroApiError,
    activateHero,
    createHero,
    deleteHero,
    fetchHeroSlides,
    fetchHeroes,
    saveHero,
    type HeroConfig,
    type HeroSlide,
} from '@/services/heroAdminService';
import { HeroPreview } from './HeroPreview';
import { LayoutTab } from './LayoutTab';
import { SlidesTab } from './SlidesTab';

const same = (a: HeroConfig, b: HeroConfig) => JSON.stringify({ ...a, updated_at: 0 }) === JSON.stringify({ ...b, updated_at: 0 });
const message = (e: unknown, fallback: string) => (e instanceof HeroApiError ? e.message : fallback);

export default function HeroManagement() {
    const [heroes, setHeroes] = useState<HeroConfig[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    // Layout edits for the selected hero that are not saved yet.
    const [draft, setDraft] = useState<HeroConfig | null>(null);
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [slidesLoading, setSlidesLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<number | null>(null);
    const [newName, setNewName] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [toDelete, setToDelete] = useState<HeroConfig | null>(null);

    const saved = heroes.find((h) => h.id === selectedId) ?? null;
    const dirty = Boolean(saved && draft && !same(saved, draft));

    const select = useCallback((hero: HeroConfig | null) => {
        setSelectedId(hero?.id ?? null);
        setDraft(hero);
        setErrors({});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const list = await fetchHeroes();
            setHeroes(list);
            select(list.find((h) => h.is_active) ?? list[0] ?? null);
        } catch (e) {
            setLoadError(message(e, 'Could not load the heroes.'));
        } finally {
            setLoading(false);
        }
    }, [select]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (selectedId === null) {
            setSlides([]);
            return;
        }
        let cancelled = false;
        setSlidesLoading(true);
        fetchHeroSlides(selectedId)
            .then((list) => {
                if (!cancelled) setSlides(list);
            })
            .catch((e) => {
                if (!cancelled) toast.error(message(e, 'Could not load the hero slides.'));
            })
            .finally(() => {
                if (!cancelled) setSlidesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const pick = (hero: HeroConfig) => {
        if (hero.id === selectedId) return;
        if (dirty && !window.confirm('Discard the unsaved layout changes on this hero?')) return;
        select(hero);
    };

    const saveLayout = async () => {
        if (!draft) return;
        setSaving(true);
        setErrors({});
        try {
            const { id, is_active: _live, updated_at: _ignored, ...body } = draft;
            const next = await saveHero(id, body);
            setHeroes((list) => list.map((h) => (h.id === next.id ? next : h)));
            setDraft(next);
            toast.success('Hero saved');
        } catch (e) {
            const err = e instanceof HeroApiError ? e : new HeroApiError('Could not save the hero settings.');
            setErrors(err.fields);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const makeLive = async (hero: HeroConfig) => {
        setBusyId(hero.id);
        try {
            const live = await activateHero(hero.id);
            setHeroes((list) => list.map((h) => ({ ...h, is_active: h.id === live.id })));
            setDraft((d) => (d ? { ...d, is_active: d.id === live.id } : d));
            toast.success(`"${live.name}" is now live on the storefront`);
        } catch (e) {
            toast.error(message(e, 'Could not make this hero live.'));
        } finally {
            setBusyId(null);
        }
    };

    const create = async () => {
        const name = (newName ?? '').trim();
        if (!name) return;
        setCreating(true);
        try {
            const hero = await createHero(name);
            setHeroes((list) => [...list, hero]);
            select(hero);
            setNewName(null);
            toast.success(hero.is_active ? 'Hero created and live' : 'Hero created. Add slides, then make it live.');
        } catch (e) {
            toast.error(message(e, 'Could not create the hero.'));
        } finally {
            setCreating(false);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setBusyId(toDelete.id);
        try {
            await deleteHero(toDelete.id);
            const rest = heroes.filter((h) => h.id !== toDelete.id);
            setHeroes(rest);
            if (toDelete.id === selectedId) select(rest.find((h) => h.is_active) ?? rest[0] ?? null);
            toast.success('Hero deleted');
            setToDelete(null);
        } catch (e) {
            toast.error(message(e, 'Could not delete the hero.'));
        } finally {
            setBusyId(null);
        }
    };

    const liveSlides = slides.filter((s) => s.is_live);

    return (
        <div className="mx-auto w-full max-w-5xl">
            <PageHeader
                title="Homepage hero"
                description="Keep several heroes ready and choose which one the storefront shows."
                actions={
                    <Button type="button" onClick={() => setNewName('')} disabled={loading || Boolean(loadError)}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        New hero
                    </Button>
                }
            />

            {loading ? (
                <div className="space-y-4" aria-busy="true">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-72 w-full" />
                </div>
            ) : loadError ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <p className="text-sm text-foreground">{loadError}</p>
                        <Button type="button" variant="outline" onClick={() => void load()}>
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Heroes</CardTitle>
                            <CardDescription>Select a hero to edit it. Only the live one is shown to buyers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {heroes.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No hero yet. Create one to start adding slides.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {heroes.map((hero) => {
                                        const selected = hero.id === selectedId;
                                        return (
                                            <li
                                                key={hero.id}
                                                className={cn('flex flex-wrap items-center gap-2 rounded-xl border p-2 pl-3', selected ? 'border-primary bg-primary-subtle' : 'border-border bg-card')}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => pick(hero)}
                                                    aria-pressed={selected}
                                                    className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                                                >
                                                    <span className="truncate text-sm font-semibold text-foreground">{hero.name}</span>
                                                    {hero.is_active ? <Badge variant="success">Live</Badge> : null}
                                                    {selected ? <span className="text-xs text-muted-foreground">Editing</span> : null}
                                                </button>
                                                {!hero.is_active ? (
                                                    <>
                                                        <Button type="button" variant="outline" size="sm" disabled={busyId === hero.id} onClick={() => void makeLive(hero)}>
                                                            {busyId === hero.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                                            Make live
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={busyId === hero.id}
                                                            onClick={() => setToDelete(hero)}
                                                            aria-label={`Delete ${hero.name}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                        </Button>
                                                    </>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {draft ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Preview: {draft.name}</CardTitle>
                                    <CardDescription>
                                        {draft.is_active ? 'This hero is live on the storefront.' : 'Not live. Buyers do not see this hero until you make it live.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {slidesLoading ? <Skeleton className="h-40 w-full" /> : <HeroPreview config={draft} slides={liveSlides} />}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Approximation of what buyers see. {liveSlides.length} active {liveSlides.length === 1 ? 'slide' : 'slides'}.
                                    </p>
                                </CardContent>
                            </Card>

                            <Tabs defaultValue="slides">
                                <TabsList>
                                    <TabsTrigger value="slides">Slides</TabsTrigger>
                                    <TabsTrigger value="layout">Layout and style{dirty ? ' *' : ''}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="slides" className="mt-4">
                                    {/* Remounts per hero so an open slide editor never carries over to another hero. */}
                                    <SlidesTab key={draft.id} slides={slides} config={draft} onChange={setSlides} />
                                </TabsContent>
                                <TabsContent value="layout" className="mt-4">
                                    <LayoutTab
                                        config={draft}
                                        onChange={(patch) => setDraft({ ...draft, ...patch })}
                                        onSave={() => void saveLayout()}
                                        saving={saving}
                                        dirty={dirty}
                                        errors={errors}
                                    />
                                </TabsContent>
                            </Tabs>
                        </>
                    ) : null}
                </div>
            )}

            <Dialog open={newName !== null} onOpenChange={(open) => (open ? null : setNewName(null))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New hero</DialogTitle>
                        <DialogDescription>It starts empty and is not shown to buyers until you make it live.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void create();
                        }}
                        className="space-y-4"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="new-hero-name">Name</Label>
                            <Input id="new-hero-name" autoFocus maxLength={80} placeholder="Black Friday" value={newName ?? ''} onChange={(e) => setNewName(e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setNewName(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={creating || !(newName ?? '').trim()}>
                                {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Create hero
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={toDelete !== null} onOpenChange={(open) => (open ? null : setToDelete(null))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete "{toDelete?.name}"?</DialogTitle>
                        <DialogDescription>This deletes the hero and all of its slides. It cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setToDelete(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" disabled={busyId === toDelete?.id} onClick={() => void confirmDelete()}>
                            Delete hero
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
