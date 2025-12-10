import { useState, useCallback } from 'react';
import jobManagementService, { Job, JobBid, JobFilters, JobCreateData, JobUpdateData, JobStats } from '../services/jobService';

export const useJobService = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    // Job operations
    const getJobs = useCallback(async (filters?: JobFilters) => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobManagementService.jobs.getJobs(filters);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getJob = useCallback(async (id: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.getJob(id);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getJobWithBids = useCallback(async (id: number) => {
        try {
            setLoading(true);
            setError(null);
            const jobWithBids = await jobManagementService.getJobWithBids(id);
            return jobWithBids;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job details';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createJob = useCallback(async (data: JobCreateData) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.createJob(data);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateJob = useCallback(async (id: number, data: JobUpdateData) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.updateJob(id, data);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteJob = useCallback(async (id: number) => {
        try {
            setLoading(true);
            setError(null);
            await jobManagementService.jobs.deleteJob(id);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getJobStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const stats = await jobManagementService.jobs.getJobStats();
            return stats;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job statistics';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Job actions
    const makeBiddable = useCallback(async (id: number, biddingDeadline?: string, minBid?: number, maxBid?: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.makeBiddable(id, biddingDeadline, minBid, maxBid);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to make job biddable';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const makeInstant = useCallback(async (id: number, fixedPrice?: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.makeInstant(id, fixedPrice);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to make job instant';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const assignProvider = useCallback(async (jobId: number, providerId: string, price?: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.assignProvider(jobId, providerId, price);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to assign provider';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const unassignProvider = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.unassignProvider(jobId);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to unassign provider';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const startJob = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.startJob(jobId);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const completeJob = useCallback(async (jobId: number, notes?: string) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.completeJob(jobId, notes);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to complete job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const cancelJob = useCallback(async (jobId: number, reason?: string) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.cancelJob(jobId, reason);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to cancel job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const activateJob = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.activateJob(jobId);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to activate job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deactivateJob = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.deactivateJob(jobId);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const featureJob = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.featureJob(jobId);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to feature job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const unfeatureJob = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const job = await jobManagementService.jobs.unfeatureJob(jobId);
            return job;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to unfeature job';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Bidding operations
    const getJobBids = useCallback(async (jobId: number) => {
        try {
            setLoading(true);
            setError(null);
            const bids = await jobManagementService.bidding.getJobBids(jobId);
            return bids;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job bids';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const acceptBid = useCallback(async (jobId: number, bidId: number) => {
        try {
            setLoading(true);
            setError(null);
            const result = await jobManagementService.bidding.acceptBid(jobId, bidId);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const rejectBid = useCallback(async (jobId: number, bidId: number, reason?: string) => {
        try {
            setLoading(true);
            setError(null);
            const bid = await jobManagementService.bidding.rejectBid(jobId, bidId, reason);
            return bid;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reject bid';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getJobOverview = useCallback(async (filters?: JobFilters) => {
        try {
            setLoading(true);
            setError(null);
            const overview = await jobManagementService.getJobOverview(filters);
            return overview;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job overview';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        // State
        loading,
        error,
        clearError,

        // Job operations
        getJobs,
        getJob,
        getJobWithBids,
        createJob,
        updateJob,
        deleteJob,
        getJobStats,
        getJobOverview,

        // Job actions
        makeBiddable,
        makeInstant,
        assignProvider,
        unassignProvider,
        startJob,
        completeJob,
        cancelJob,
        activateJob,
        deactivateJob,
        featureJob,
        unfeatureJob,

        // Bidding operations
        getJobBids,
        acceptBid,
        rejectBid,
    };
};

export default useJobService;
