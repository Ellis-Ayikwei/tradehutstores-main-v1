/**
 * Stores-Admin / Search Operations dashboard
 *
 * Surfaces the state of the search subsystem to operators:
 *
 *   • Subsystem health (Elasticsearch, embeddings, embedding service URL).
 *   • Embedding coverage stats (so ops can spot a stale/half-built index).
 *   • A live preview that hits both the text and image search endpoints so
 *     the team can sanity-check the catalogue without leaving the admin.
 *
 * The page is intentionally tolerant of partial unavailability — it shows
 * a banner per-subsystem rather than rendering an error wall.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    IconAlertTriangle,
    IconCircleCheckFilled,
    IconCloudComputing,
    IconCpu,
    IconRefresh,
    IconSearch,
    IconUpload,
    IconX,
} from '@tabler/icons-react';
import {
    adminImageSearch,
    adminSearchProducts,
    fetchSearchHealth,
    fetchSearchStats,
    type AdminSearchHit,
    type SearchAdminStats,
    type SearchHealth,
} from '../../../services/searchService';

const SearchOpsPage: React.FC = () => {
    const [health, setHealth] = useState<SearchHealth | null>(null);
    const [stats, setStats] = useState<SearchAdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    const [textQuery, setTextQuery] = useState('');
    const [textResults, setTextResults] = useState<AdminSearchHit[]>([]);
    const [textEngine, setTextEngine] = useState<'elasticsearch' | 'orm' | null>(null);
    const [textBusy, setTextBusy] = useState(false);

    const [imageBusy, setImageBusy] = useState(false);
    const [imageResults, setImageResults] = useState<AdminSearchHit[]>([]);
    const [imageError, setImageError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        const [h, s] = await Promise.all([fetchSearchHealth(), fetchSearchStats()]);
        setHealth(h);
        setStats(s);
        setLoading(false);
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const runText = useCallback(async () => {
        if (!textQuery.trim()) return;
        setTextBusy(true);
        const result = await adminSearchProducts(textQuery);
        if (result) {
            setTextResults(result.results ?? []);
            setTextEngine(result.engine);
        } else {
            setTextResults([]);
            setTextEngine(null);
        }
        setTextBusy(false);
    }, [textQuery]);

    const onPickImage = useCallback(async (file: File | undefined) => {
        if (!file) return;
        setImageError(null);
        setImageBusy(true);
        try {
            const result = await adminImageSearch(file);
            if (!result) {
                setImageResults([]);
                setImageError('Visual search is unavailable on this deployment.');
            } else {
                setImageResults(result.results);
            }
        } finally {
            setImageBusy(false);
        }
    }, []);

    const esEnabled = !!health?.elasticsearch.enabled;
    const embedEnabled = !!health?.embeddings.enabled;

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <header className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-on-surface dark:text-white">Search Operations</h1>
                    <p className="text-sm text-on-surface-variant dark:text-gray-400">
                        Health, coverage and a live preview for the TradeHut search subsystem.
                    </p>
                </div>
                <button
                    onClick={refresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                    <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </header>

            {/* Subsystem health */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HealthCard
                    icon={<IconCloudComputing size={24} className="text-blue-500" />}
                    title="Elasticsearch"
                    enabled={esEnabled}
                    detail={health?.elasticsearch.url ?? '—'}
                    library={health?.elasticsearch.library_installed}
                />
                <HealthCard
                    icon={<IconCpu size={24} className="text-fuchsia-500" />}
                    title="Visual search"
                    enabled={embedEnabled}
                    detail={health?.embeddings.service_url || 'in-process CLIP'}
                    library={health?.embeddings.library_installed}
                />
                <StatCard stats={stats} />
            </section>

            {/* Live text search */}
            <section className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="font-semibold text-on-surface dark:text-white mb-3">Live text search</h2>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={textQuery}
                            onChange={(e) => setTextQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') runText(); }}
                            placeholder="Try: wireless headphones, Nike, MacBook…"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={runText}
                        disabled={textBusy || !textQuery.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                        {textBusy ? 'Searching…' : 'Search'}
                    </button>
                </div>
                {textEngine && (
                    <p className="mt-2 text-xs text-on-surface-variant dark:text-gray-400">
                        Engine: <span className="font-mono">{textEngine}</span>
                        {' • '}
                        {textResults.length} hit{textResults.length === 1 ? '' : 's'}
                    </p>
                )}
                <ResultsTable results={textResults} />
            </section>

            {/* Live image search */}
            <section className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
                <h2 className="font-semibold text-on-surface dark:text-white mb-3">Live image search</h2>
                {!embedEnabled && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 text-sm flex items-center gap-2">
                        <IconAlertTriangle size={16} />
                        Visual search is disabled. Set <code className="font-mono">SEARCH_ENABLE_EMBEDDINGS=true</code>
                        and run <code className="font-mono">manage.py build_embeddings</code> to enable.
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={!embedEnabled || imageBusy}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                        <IconUpload size={16} />
                        {imageBusy ? 'Searching…' : 'Pick an image'}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onPickImage(e.target.files?.[0])}
                    />
                    {imageError && (
                        <span className="text-sm text-red-500 flex items-center gap-1">
                            <IconX size={14} /> {imageError}
                        </span>
                    )}
                </div>
                <ResultsTable results={imageResults} />
            </section>
        </div>
    );
};

// ─── Bits ────────────────────────────────────────────────────────────────────

const HealthCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    enabled: boolean;
    detail: string;
    library?: boolean;
}> = ({ icon, title, enabled, detail, library }) => (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center gap-3">
            {icon}
            <div>
                <h3 className="font-semibold text-on-surface dark:text-white">{title}</h3>
                <p className="text-xs text-on-surface-variant dark:text-gray-500 truncate" title={detail}>
                    {detail}
                </p>
            </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
            {enabled ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <IconCircleCheckFilled size={14} /> Enabled
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400">
                    <IconAlertTriangle size={14} /> Disabled
                </span>
            )}
            {library === false && (
                <span className="text-xs text-amber-500">library missing</span>
            )}
        </div>
    </div>
);

const StatCard: React.FC<{ stats: SearchAdminStats | null }> = ({ stats }) => (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="font-semibold text-on-surface dark:text-white">Embedding coverage</h3>
        {stats ? (
            <>
                <p className="mt-1 text-3xl font-bold text-on-surface dark:text-white">
                    {stats.embedding_coverage_pct.toFixed(1)}%
                </p>
                <p className="text-xs text-on-surface-variant dark:text-gray-500 mt-1">
                    {stats.embeddings_total.toLocaleString()} of{' '}
                    {stats.products_total.toLocaleString()} products
                </p>
            </>
        ) : (
            <p className="mt-1 text-sm text-gray-400">Stats unavailable</p>
        )}
    </div>
);

const ResultsTable: React.FC<{ results: AdminSearchHit[] }> = ({ results }) => {
    if (results.length === 0) return null;
    return (
        <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">
                        <th className="py-2 pr-4">#</th>
                        <th className="py-2 pr-4">Product</th>
                        <th className="py-2 pr-4">Category</th>
                        <th className="py-2 pr-4">Price</th>
                        <th className="py-2 pr-4">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((hit, i) => (
                        <tr key={hit.id} className="border-b border-gray-100 dark:border-gray-800/60">
                            <td className="py-2 pr-4 text-xs text-gray-400">{i + 1}</td>
                            <td className="py-2 pr-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {hit.image ? (
                                        // eslint-disable-next-line jsx-a11y/alt-text
                                        <img src={hit.image} className="h-10 w-10 rounded object-cover shrink-0" />
                                    ) : (
                                        <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{hit.name}</p>
                                        {hit.brand && <p className="text-xs text-on-surface-variant">{hit.brand}</p>}
                                    </div>
                                </div>
                            </td>
                            <td className="py-2 pr-4 text-on-surface-variant">{hit.category ?? '—'}</td>
                            <td className="py-2 pr-4 font-mono">
                                {typeof hit.final_price === 'number'
                                    ? hit.final_price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
                                    : typeof hit.price === 'number'
                                    ? hit.price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
                                    : '—'}
                            </td>
                            <td className="py-2 pr-4 text-xs text-gray-400">
                                {typeof hit.similarity === 'number'
                                    ? `sim ${hit.similarity.toFixed(3)}`
                                    : typeof hit.score === 'number'
                                    ? hit.score.toFixed(2)
                                    : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SearchOpsPage;
