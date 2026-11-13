import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { HeroApiError, activateHero, fetchHero, fetchHeroSlides, saveHero, type HeroConfig, type HeroSlide } from '@/services/heroAdminService';
import { HeroPreview } from './HeroPreview';
import { LayoutTab } from './LayoutTab';
import { SlidesTab } from './SlidesTab';

const LIST_PATH = '/admin/merchandising/hero';

const same = (a: HeroConfig, b: HeroConfig) => JSON.stringify({ ...a, updated_at: 0 }) === JSON.stringify({ ...b, updated_at: 0 });
const message = (e: unknown, fallback: string) => (e instanceof HeroApiError ? e.message : fallback);

/** Edit page for one hero: preview, slides, layout. The parent remounts it per hero id. */
export function HeroEditor({ heroId }: { heroId: number }) {
    const [saved, setSaved] = useState<HeroConfig | null>(null);
    // Layout edits that are not saved yet.
    const [draft, setDraft] = useState<HeroConfig | null>(null);
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [activating, setActivating] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const dirty = Boolean(saved && draft && !same(saved, draft));

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [hero, list] = await Promise.all([fetchHero(heroId), fetchHeroSlides(heroId)]);
            setSaved(hero);
            setDraft(hero);
            setSlides(list);
        } catch (e) {
            setLoadError(message(e, 'Could not load this hero.'));
        } finally {
            setLoading(false);
        }
    }, [heroId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const saveLayout = async () => {
        if (!draft) return;
        setSaving(true);
        setErrors({});
        try {
            const { id, is_active: _live, updated_at: _ignored, ...body } = draft;
            const next = await saveHero(id, body);
            setSaved(next);
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

    const makeLive = async () => {
        setActivating(true);
        try {
            const live = await activateHero(heroId);
            // Only the live flag is taken from the response so unsaved layout edits survive.
            setSaved((h) => (h ? { ...h, is_active: live.is_active } : h));
            setDraft((d) => (d ? { ...d, is_active: live.is_active } : d));
            toast.success(`"${live.name}" is now live on the storefront`);
        } catch (e) {
            toast.error(message(e, 'Could not make this hero live.'));
        } finally {
            setActivating(false);
        }
    };

    const liveSlides = slides.filter((s) => s.is_live);

    return (
        <div className="mx-auto w-full max-w-5xl">
            <Link
                to={LIST_PATH}
                onClick={(e) => {
                    if (dirty && !window.confirm('Discard the unsaved layout changes on this hero?')) e.preventDefault();
                }}
                className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All heroes
            </Link>

            {loading ? (
                <div className="space-y-4" aria-busy="true">
                    <Skeleton className="h-12 w-2/3" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-72 w-full" />
                </div>
            ) : loadError || !saved || !draft ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <p className="text-sm text-foreground">{loadError ?? 'Could not load this hero.'}</p>
                        <Button type="button" variant="outline" onClick={() => void load()}>
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <PageHeader
                        title={saved.name}
                        description={saved.is_active ? 'This hero is live on the storefront.' : 'Not live. Buyers do not see this hero until you make it live.'}
                        actions={
                            saved.is_active ? (
                                <Badge variant="success">Live</Badge>
                            ) : (
                                <Button type="button" variant="outline" disabled={activating} onClick={() => void makeLive()}>
                                    {activating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                    Make live
                                </Button>
                            )
                        }
                        className="pb-0"
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>
                                Approximation of what buyers see. {liveSlides.length} active {liveSlides.length === 1 ? 'slide' : 'slides'}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <HeroPreview config={draft} slides={liveSlides} />
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="slides">
                        <TabsList>
                            <TabsTrigger value="slides">Slides</TabsTrigger>
                            <TabsTrigger value="layout">Layout and style{dirty ? ' *' : ''}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="slides" className="mt-4">
                            <SlidesTab slides={slides} config={draft} onChange={setSlides} />
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
                </div>
            )}
        </div>
    );
}
