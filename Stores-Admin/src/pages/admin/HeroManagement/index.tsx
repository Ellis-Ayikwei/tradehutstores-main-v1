import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { HeroApiError, activateHero, createHero, deleteHero, fetchHeroes, type HeroConfig } from '@/services/heroAdminService';
import { HeroEditor } from './HeroEditor';

const message = (e: unknown, fallback: string) => (e instanceof HeroApiError ? e.message : fallback);

/** `?hero=<id>` opens that hero's edit page; without it this is the list of heroes. */
export default function HeroManagement() {
    const [params] = useSearchParams();
    const heroId = Number(params.get('hero'));
    // Keyed so moving between heroes never carries edits or an open slide editor across.
    return Number.isInteger(heroId) && heroId > 0 ? <HeroEditor key={heroId} heroId={heroId} /> : <HeroList />;
}

function HeroList() {
    const navigate = useNavigate();
    const [heroes, setHeroes] = useState<HeroConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [newName, setNewName] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [toDelete, setToDelete] = useState<HeroConfig | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            setHeroes(await fetchHeroes());
        } catch (e) {
            setLoadError(message(e, 'Could not load the heroes.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const makeLive = async (hero: HeroConfig) => {
        setBusyId(hero.id);
        try {
            const live = await activateHero(hero.id);
            setHeroes((list) => list.map((h) => ({ ...h, is_active: h.id === live.id })));
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
            toast.success(hero.is_active ? 'Hero created and live' : 'Hero created. Add slides, then make it live.');
            navigate(`?hero=${hero.id}`);
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
            setHeroes((list) => list.filter((h) => h.id !== toDelete.id));
            toast.success('Hero deleted');
            setToDelete(null);
        } catch (e) {
            toast.error(message(e, 'Could not delete the hero.'));
        } finally {
            setBusyId(null);
        }
    };

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
                <Skeleton className="h-40 w-full" aria-busy="true" />
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
                <Card>
                    <CardHeader>
                        <CardTitle>Heroes</CardTitle>
                        <CardDescription>Open a hero to edit its slides and layout. Only the live one is shown to buyers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {heroes.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">No hero yet. Create one to start adding slides.</p>
                        ) : (
                            <ul className="space-y-2">
                                {heroes.map((hero) => (
                                    <li key={hero.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 pl-3">
                                        <Link
                                            to={`?hero=${hero.id}`}
                                            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                                        >
                                            <span className="truncate text-sm font-semibold text-foreground">{hero.name}</span>
                                            {hero.is_active ? <Badge variant="success">Live</Badge> : null}
                                        </Link>
                                        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`?hero=${hero.id}`)}>
                                            <Pencil className="h-4 w-4" aria-hidden="true" />
                                            Edit
                                        </Button>
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
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
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
