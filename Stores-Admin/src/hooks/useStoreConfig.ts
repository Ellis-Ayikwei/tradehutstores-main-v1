import { useCallback, useEffect, useState } from 'react';
import {
    fetchStoreConfig,
    StoreConfig,
    StoreConfigPatch,
    updateStoreConfig,
} from '../services/storeConfigService';

interface UseStoreConfig {
    config: StoreConfig | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    /** Update a subset of the singleton, returning the merged result. */
    save: (patch: StoreConfigPatch) => Promise<StoreConfig | null>;
    /** Re-fetch from the BE — discards local edits on the caller's side. */
    refresh: () => Promise<void>;
}

/**
 * Tab-friendly hook that fetches /store/config/ once on mount and exposes a
 * `save(patch)` that PATCHes only the provided fields. Each tab projects its
 * own slice from `config` for local editing and sends the slice back.
 */
export function useStoreConfig(): UseStoreConfig {
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchStoreConfig();
            setConfig(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load store configuration.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const save = useCallback(async (patch: StoreConfigPatch): Promise<StoreConfig | null> => {
        setSaving(true);
        setError(null);
        try {
            const next = await updateStoreConfig(patch);
            setConfig(next);
            return next;
        } catch (e: any) {
            const detail =
                e?.response?.data && typeof e.response.data === 'object'
                    ? Object.entries(e.response.data)
                          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                          .join('\n')
                    : e?.message ?? 'Save failed.';
            setError(detail);
            return null;
        } finally {
            setSaving(false);
        }
    }, []);

    return { config, loading, saving, error, save, refresh };
}
