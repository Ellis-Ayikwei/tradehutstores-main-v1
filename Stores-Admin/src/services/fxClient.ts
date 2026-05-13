import axiosInstance from './axiosInstance';

export type FxSnapshotResponse = {
    base_currency: string;
    rates: Record<string, number>;
    stale: boolean;
    source: string;
    as_of?: string;
    snapshot_id?: string;
};

export async function fetchFxSnapshot(): Promise<FxSnapshotResponse | null> {
    try {
        const r = await axiosInstance.get<FxSnapshotResponse>('core/fx/snapshot/');
        return r.data ?? null;
    } catch {
        return null;
    }
}
