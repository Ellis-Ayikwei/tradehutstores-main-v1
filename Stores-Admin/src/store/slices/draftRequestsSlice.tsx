import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ServiceRequest } from '../../types';
import axiosInstance from '../../services/axiosInstance';

interface DraftRequest {
    id: string;
    createdAt: string;
    lastModified: string;
    data: Partial<ServiceRequest>;
    source: 'local' | 'api';
}

interface DraftRequestsState {
    drafts: DraftRequest[];
    loading: boolean;
    error: string | null;
}

const loadDraftsFromStorage = (): DraftRequest[] => {
    if (typeof window === 'undefined') return [];
    const drafts = localStorage.getItem('draftRequests');
    return drafts ? JSON.parse(drafts).map((draft: DraftRequest) => ({ ...draft, source: 'local' })) : [];
};

const saveDraftsToStorage = (drafts: DraftRequest[]) => {
    if (typeof window === 'undefined') return;
    const localDrafts = drafts.filter((draft) => draft.source === 'local');
    localStorage.setItem('draftRequests', JSON.stringify(localDrafts));
};

export const fetchDrafts = createAsyncThunk('draftRequests/fetchDrafts', async (params: { user_id: string }, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get(`/requests/drafts?user_id=${params.user_id}`);
        return response.data.map((draft: any) => ({
            ...draft,
            source: 'api',
        }));
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch drafts');
    }
});

const initialState: DraftRequestsState = {
    drafts: loadDraftsFromStorage(),
    loading: false,
    error: null,
};

const draftRequestsSlice = createSlice({
    name: 'draftRequests',
    initialState,
    reducers: {
        addDraft: (state, action: PayloadAction<{ id: string; data: Partial<ServiceRequest> }>) => {
            const { id, data } = action.payload;
            const now = new Date().toISOString();

            // Remove any existing draft with the same ID
            state.drafts = state.drafts.filter((draft) => draft.id !== id);

            // Add new draft
            state.drafts.push({
                id,
                createdAt: now,
                lastModified: now,
                data,
                source: 'local',
            });

            saveDraftsToStorage(state.drafts);
        },
        updateDraft: (state, action: PayloadAction<{ id: string; data: Partial<ServiceRequest> }>) => {
            const { id, data } = action.payload;
            const draftIndex = state.drafts.findIndex((draft) => draft.id === id);

            if (draftIndex !== -1) {
                state.drafts[draftIndex] = {
                    ...state.drafts[draftIndex],
                    data: {
                        ...state.drafts[draftIndex].data,
                        ...data,
                    },
                    lastModified: new Date().toISOString(),
                };
                saveDraftsToStorage(state.drafts);
            }
        },
        removeDraft: (state, action: PayloadAction<{ id: string; source: 'local' | 'api' }>) => {
            const { id, source } = action.payload;
            state.drafts = state.drafts.filter((draft) => !(draft.id === id && draft.source === source));
            if (source === 'local') {
                saveDraftsToStorage(state.drafts);
            }
        },
        clearDrafts: (state) => {
            state.drafts = state.drafts.filter((draft) => draft.source === 'api');
            saveDraftsToStorage(state.drafts);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDrafts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDrafts.fulfilled, (state, action) => {
                state.loading = false;
                // Keep local drafts and add API drafts
                const localDrafts = state.drafts.filter((draft) => draft.source === 'local');
                state.drafts = [...localDrafts, ...action.payload];
            })
            .addCase(fetchDrafts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { addDraft, updateDraft, removeDraft, clearDrafts } = draftRequestsSlice.actions;
export default draftRequestsSlice.reducer;
