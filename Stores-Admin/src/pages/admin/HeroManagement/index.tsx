import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
    HeroApiError,
    fetchHeroConfig,
    fetchHeroSlides,
    saveHeroConfig,
    type HeroConfig,
    type HeroSlide,
} from '@/services/heroAdminService';
import { HeroPreview } from './HeroPreview';
import { LayoutTab } from './LayoutTab';
import { SlidesTab } from './SlidesTab';

const same = (a: HeroConfig, b: HeroConfig) => JSON.stringify({ ...a, updated_at: 0 }) === JSON.stringify({ ...b, updated_at: 0 });

export default function HeroManagement() {
    const [saved, setSaved] = useState<HeroConfig | null>(null);
    const [draft, setDraft] = useState<HeroConfig | null>(null);
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [config, list] = await Promise.all([fetchHeroConfig(), fetchHeroSlides()]);
            setSaved(config);
            setDraft(config);
            setSlides(list);
        } catch (e) {
            setLoadError(e instanceof HeroApiError ? e.message : 'Could not load the hero settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const dirty = Boolean(saved && draft && !same(saved, draft));

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
            const { updated_at: _ignored, ...body } = draft;
            const next = await saveHeroConfig(body);
            setSaved(next);
            setDraft(next);
            toast.success('Hero layout saved');
        } catch (e) {
            const err = e instanceof HeroApiError ? e : new HeroApiError('Could not save the hero settings.');
            setErrors(err.fields);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const live = slides.filter((s) => s.is_live);

    return (
        <div className="mx-auto w-full max-w-5xl">
            <PageHeader title="Homepage hero" description="Choose the arrangement, banners, timing and background of the storefront home hero." />

            {loading ? (
                <div className="space-y-4" aria-busy="true">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-72 w-full" />
                </div>
            ) : loadError || !draft ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <p className="text-sm text-foreground">{loadError ?? 'Could not load the hero settings.'}</p>
                        <Button type="button" variant="outline" onClick={() => void load()}>
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Live preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <HeroPreview config={draft} slides={live} />
                            <p className="mt-2 text-xs text-muted-foreground">
                                Approximation of what buyers see. {live.length} live {live.length === 1 ? 'slide' : 'slides'}.
                            </p>
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
