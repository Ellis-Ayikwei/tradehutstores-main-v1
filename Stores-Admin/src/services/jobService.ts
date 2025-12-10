import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import axiosInstance from "./axiosInstance";

// =================== TYPES AND INTERFACES ===================

export interface JobAddress {
    id?: number;
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_primary?: boolean;
    address_type?: 'pickup' | 'delivery' | 'both';
    latitude?: number;
    longitude?: number;
    access_notes?: string;
}

export interface JobBid {
    id: number;
    provider_id: string;
    provider_name: string;
    provider_rating: number;
    bid_amount: number;
    estimated_duration: number;
    message?: string;
    created_at: string;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    provider_profile_picture?: string;
    provider_email: string;
    provider_phone?: string;
}

export interface JobLocation {
    id?: number;
    name: string;
    address: JobAddress;
    contact_person?: string;
    contact_phone?: string;
    special_instructions?: string;
    access_code?: string;
    preferred_time_start?: string;
    preferred_time_end?: string;
}

export interface Job {
    id: number;
    title: string;
    description: string;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    job_type: 'instant' | 'bidding';
    status: 'draft' | 'pending' | 'bidding' | 'accepted' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
    category: string;
    subcategory?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';

    // Pricing
    estimated_price?: number;
    fixed_price?: number;
    hourly_rate?: number;
    budget_min?: number;
    budget_max?: number;
    final_price?: number;

    // Timing
    created_at: string;
    updated_at: string;
    scheduled_start?: string;
    scheduled_end?: string;
    actual_start?: string;
    actual_end?: string;
    duration_estimate?: number;

    // Location
    pickup_location?: JobLocation;
    delivery_location?: JobLocation;
    service_location?: JobLocation;

    // Provider
    assigned_provider_id?: string;
    assigned_provider_name?: string;
    assigned_provider_rating?: number;

    // Bidding
    bidding_enabled: boolean;
    bidding_deadline?: string;
    min_bid_amount?: number;
    max_bid_amount?: number;
    current_bid_count: number;
    winning_bid?: JobBid;
    bids?: JobBid[];

    // Requirements
    equipment_needed?: string[];
    skills_required?: string[];
    certifications_required?: string[];
    vehicle_type_required?: string;

    // Additional fields
    special_instructions?: string;
    is_recurring: boolean;
    recurrence_pattern?: string;
    images?: string[];
    documents?: string[];
    payment_method?: string;
    payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded';
    notes?: string;
    tags?: string[];

    // System fields
    is_active: boolean;
    is_featured: boolean;
    view_count: number;
    application_count: number;
}

export interface JobFilters {
    status?: string;
    job_type?: string;
    category?: string;
    priority?: string;
    customer_id?: string;
    provider_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    page_size?: number;
}

export interface JobCreateData {
    title: string;
    description: string;
    customer_id: string;
    job_type: 'instant' | 'bidding';
    category: string;
    subcategory?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimated_price?: number;
    fixed_price?: number;
    hourly_rate?: number;
    budget_min?: number;
    budget_max?: number;
    scheduled_start?: string;
    scheduled_end?: string;
    pickup_location?: Omit<JobLocation, 'id'>;
    delivery_location?: Omit<JobLocation, 'id'>;
    service_location?: Omit<JobLocation, 'id'>;
    bidding_enabled: boolean;
    bidding_deadline?: string;
    min_bid_amount?: number;
    max_bid_amount?: number;
    equipment_needed?: string[];
    skills_required?: string[];
    certifications_required?: string[];
    vehicle_type_required?: string;
    special_instructions?: string;
    is_recurring: boolean;
    recurrence_pattern?: string;
    images?: string[];
    documents?: string[];
    payment_method?: string;
    tags?: string[];
}

export interface JobUpdateData extends Partial<JobCreateData> {
    status?: 'draft' | 'pending' | 'bidding' | 'accepted' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
    assigned_provider_id?: string;
    final_price?: number;
    actual_start?: string;
    actual_end?: string;
    payment_status?: 'pending' | 'paid' | 'partially_paid' | 'refunded';
    notes?: string;
    is_active?: boolean;
    is_featured?: boolean;
}

export interface BidCreateData {
    job_id: number;
    bid_amount: number;
    estimated_duration: number;
    message?: string;
}

export interface BidUpdateData {
    bid_amount?: number;
    estimated_duration?: number;
    message?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}

export interface JobStats {
    total_jobs: number;
    draft_jobs: number;
    pending_jobs: number;
    bidding_jobs: number;
    accepted_jobs: number;
    assigned_jobs: number;
    in_transit_jobs: number;
    completed_jobs: number;
    cancelled_jobs: number;
    instant_jobs: number;
    bidding_enabled_jobs: number;
    total_bids: number;
    avg_bid_amount: number;
    avg_job_value: number;
    avg_completion_time: number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// =================== axiosInstance ENDPOINTS ===================

const ENDPOINTS = {
    // Jobs
    JOBS: '/jobs/',
    JOB_DETAIL: (id: string) => `/jobs/${id}/`,
    JOB_STATS: '/jobs/stats/',

    // Job Actions
    JOB_MAKE_BIDDABLE: (id: number) => `/jobs/${id}/make_biddable/`,
    JOB_MAKE_INSTANT: (id: number) => `/jobs/${id}/make_instant/`,
    JOB_ASSIGN_PROVIDER: (id: number) => `/jobs/${id}/assign_provider/`,
    JOB_UNASSIGN_PROVIDER: (id: number) => `/jobs/${id}/unassign_provider/`,
    JOB_START: (id: number) => `/jobs/${id}/start/`,
    JOB_COMPLETE: (id: number) => `/jobs/${id}/complete/`,
    JOB_CANCEL: (id: number) => `/jobs/${id}/cancel/`,
    JOB_ACTIVATE: (id: number) => `/jobs/${id}/activate/`,
    JOB_DEACTIVATE: (id: number) => `/jobs/${id}/deactivate/`,
    JOB_FEATURE: (id: number) => `/jobs/${id}/feature/`,
    JOB_UNFEATURE: (id: number) => `/jobs/${id}/unfeature/`,

    // Bidding
    JOB_BIDS: (jobId: number) => `/jobs/${jobId}/bids/`,
    BID_DETAIL: (jobId: number, bidId: number) => `/jobs/${jobId}/bids/${bidId}/`,
    BID_ACCEPT: (jobId: number, bidId: number) => `/jobs/${jobId}/bids/${bidId}/accept/`,
    BID_REJECT: (jobId: number, bidId: number) => `/jobs/${jobId}/bids/${bidId}/reject/`,

    // Provider bids
    PROVIDER_BIDS: '/provider/bids/',
    PROVIDER_BID_CREATE: '/provider/bids/',
    PROVIDER_BID_UPDATE: (bidId: number) => `/provider/bids/${bidId}/`,
    PROVIDER_BID_WITHDRAW: (bidId: number) => `/provider/bids/${bidId}/withdraw/`,
};

// =================== JOB SERVICE ===================

class JobService {
    /**
     * Get all jobs with optional filtering
     */
    async getJobs(filters?: JobFilters): Promise<PaginatedResponse<Job>> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.JOBS, { params: filters });
            return response.data;
        } catch (error) {
            console.error('Error fetching jobs:', error);
            throw new Error('Failed to fetch jobs');
        }
    }

    /**
     * Get job by ID
     */
    async getJob(id: number): Promise<Job> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.JOB_DETAIL(id));
            console.log("job dtata", response.data)
            return response.data;
        } catch (error) {
            console.error('Error fetching job:', error);
            throw new Error('Failed to fetch job');
        }
    }

    /**
     * Create new job
     */
    async createJob(data: JobCreateData): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOBS, data);
            return response.data;
        } catch (error) {
            console.error('Error creating job:', error);
            throw new Error('Failed to create job');
        }
    }

    /**
     * Update job
     */
    async updateJob(id: number, data: JobUpdateData): Promise<Job> {
        try {
            const response = await axiosInstance.patch(ENDPOINTS.JOB_DETAIL(id), data);
            return response.data;
        } catch (error) {
            console.error('Error updating job:', error);
            throw new Error('Failed to update job');
        }
    }

    /**
     * Delete job
     */
    async deleteJob(id: number): Promise<void> {
        try {
            await axiosInstance.delete(ENDPOINTS.JOB_DETAIL(id));
        } catch (error) {
            console.error('Error deleting job:', error);
            throw new Error('Failed to delete job');
        }
    }

    /**
     * Get job statistics
     */
    async getJobStats(): Promise<JobStats> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.JOB_STATS);
            return response.data;
        } catch (error) {
            console.error('Error fetching job stats:', error);
            throw new Error('Failed to fetch job statistics');
        }
    }

    // =================== JOB ACTIONS ===================

    /**
     * Make job biddable
     */
    async makeBiddable(id: number, biddingDeadline?: string, minBid?: number, maxBid?: number): Promise<Job> {
        try {
            const data = {
                bidding_deadline: biddingDeadline,
                min_bid_amount: minBid,
                max_bid_amount: maxBid,
            };
            const response = await axiosInstance.post(ENDPOINTS.JOB_MAKE_BIDDABLE(id), data);
            return response.data;
        } catch (error) {
            console.error('Error making job biddable:', error);
            throw new Error('Failed to make job biddable');
        }
    }

    /**
     * Make job instant
     */
    async makeInstant(id: number, fixedPrice?: number): Promise<Job> {
        try {
            const data = { fixed_price: fixedPrice };
            const response = await axiosInstance.post(ENDPOINTS.JOB_MAKE_INSTANT(id), data);
            return response.data;
        } catch (error) {
            console.error('Error making job instant:', error);
            throw new Error('Failed to make job instant');
        }
    }

    /**
     * Assign provider to job
     */
    async assignProvider(jobId: number, providerId: string, price?: number): Promise<Job> {
        try {
            const data = {
                provider_id: providerId,
                final_price: price,
            };
            const response = await axiosInstance.post(ENDPOINTS.JOB_ASSIGN_PROVIDER(jobId), data);
            return response.data;
        } catch (error) {
            console.error('Error assigning provider:', error);
            throw new Error('Failed to assign provider');
        }
    }

    /**
     * Unassign provider from job
     */
    async unassignProvider(jobId: number): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOB_UNASSIGN_PROVIDER(jobId));
            return response.data;
        } catch (error) {
            console.error('Error unassigning provider:', error);
            throw new Error('Failed to unassign provider');
        }
    }

    /**
     * Start job
     */
    async startJob(jobId: number): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOB_START(jobId));
            return response.data;
        } catch (error) {
            console.error('Error starting job:', error);
            throw new Error('Failed to start job');
        }
    }

    /**
     * Complete job
     */
    async completeJob(jobId: number, notes?: string): Promise<Job> {
        try {
            const data = { notes };
            const response = await axiosInstance.post(ENDPOINTS.JOB_COMPLETE(jobId), data);
            return response.data;
        } catch (error) {
            console.error('Error completing job:', error);
            throw new Error('Failed to complete job');
        }
    }

    /**
     * Cancel job
     */
    async cancelJob(jobId: number, reason?: string): Promise<Job> {
        try {
            const data = { reason };
            const response = await axiosInstance.post(ENDPOINTS.JOB_CANCEL(jobId), data);
            return response.data;
        } catch (error) {
            console.error('Error cancelling job:', error);
            throw new Error('Failed to cancel job');
        }
    }

    /**
     * Activate job
     */
    async activateJob(jobId: number): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOB_ACTIVATE(jobId));
            return response.data;
        } catch (error) {
            console.error('Error activating job:', error);
            throw new Error('Failed to activate job');
        }
    }

    /**
     * Deactivate job
     */
    async deactivateJob(jobId: number): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOB_DEACTIVATE(jobId));
            return response.data;
        } catch (error) {
            console.error('Error deactivating job:', error);
            throw new Error('Failed to deactivate job');
        }
    }

    /**
     * Feature job
     */
    async featureJob(jobId: number): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOB_FEATURE(jobId));
            return response.data;
        } catch (error) {
            console.error('Error featuring job:', error);
            throw new Error('Failed to feature job');
        }
    }

    /**
     * Unfeature job
     */
    async unfeatureJob(jobId: number): Promise<Job> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.JOB_UNFEATURE(jobId));
            return response.data;
        } catch (error) {
            console.error('Error unfeaturing job:', error);
            throw new Error('Failed to unfeature job');
        }
    }
}

// =================== BIDDING SERVICE ===================

class BiddingService {
    /**
     * Get all bids for a job
     */
    async getJobBids(jobId: number): Promise<JobBid[]> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.JOB_BIDS(jobId));
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching job bids:', error);
            throw new Error('Failed to fetch job bids');
        }
    }

    /**
     * Accept a bid
     */
    async acceptBid(jobId: number, bidId: number): Promise<{ job: Job; bid: JobBid }> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.BID_ACCEPT(jobId, bidId));
            return response.data;
        } catch (error) {
            console.error('Error accepting bid:', error);
            throw new Error('Failed to accept bid');
        }
    }

    /**
     * Reject a bid
     */
    async rejectBid(jobId: number, bidId: number, reason?: string): Promise<JobBid> {
        try {
            const data = { reason };
            const response = await axiosInstance.post(ENDPOINTS.BID_REJECT(jobId, bidId), data);
            return response.data;
        } catch (error) {
            console.error('Error rejecting bid:', error);
            throw new Error('Failed to reject bid');
        }
    }

    // =================== PROVIDER BIDDING ===================

    /**
     * Get provider's bids
     */
    async getProviderBids(filters?: { status?: string; search?: string }): Promise<JobBid[]> {
        try {
            const response = await axiosInstance.get(ENDPOINTS.PROVIDER_BIDS, { params: filters });
            return response.data.results || response.data;
        } catch (error) {
            console.error('Error fetching provider bids:', error);
            throw new Error('Failed to fetch provider bids');
        }
    }

    /**
     * Create a bid
     */
    async createBid(data: BidCreateData): Promise<JobBid> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.PROVIDER_BID_CREATE, data);
            return response.data;
        } catch (error) {
            console.error('Error creating bid:', error);
            throw new Error('Failed to create bid');
        }
    }

    /**
     * Update a bid
     */
    async updateBid(bidId: number, data: BidUpdateData): Promise<JobBid> {
        try {
            const response = await axiosInstance.patch(ENDPOINTS.PROVIDER_BID_UPDATE(bidId), data);
            return response.data;
        } catch (error) {
            console.error('Error updating bid:', error);
            throw new Error('Failed to update bid');
        }
    }

    /**
     * Withdraw a bid
     */
    async withdrawBid(bidId: number): Promise<JobBid> {
        try {
            const response = await axiosInstance.post(ENDPOINTS.PROVIDER_BID_WITHDRAW(bidId));
            return response.data;
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            throw new Error('Failed to withdraw bid');
        }
    }
}

// =================== COMBINED SERVICE ===================

class JobManagementService {
    public jobs: JobService;
    public bidding: BiddingService;

    constructor() {
        this.jobs = new JobService();
        this.bidding = new BiddingService();
    }

    /**
     * Get complete job overview with stats
     */
    async getJobOverview(filters?: JobFilters) {
        try {
            const [jobs, stats] = await Promise.all([this.jobs.getJobs(filters), this.jobs.getJobStats()]);

            return {
                jobs: jobs.results,
                pagination: {
                    count: jobs.count,
                    next: jobs.next,
                    previous: jobs.previous,
                },
                stats,
            };
        } catch (error) {
            console.error('Error fetching job overview:', error);
            throw new Error('Failed to fetch job overview');
        }
    }

    /**
     * Get complete job details with bids
     */
    async getJobWithBids(jobId: number): Promise<Job & { bids: JobBid[] }> {
        try {
            const [job, bids] = await Promise.all([this.jobs.getJob(jobId), this.bidding.getJobBids(jobId)]);

            return {
                ...job,
                bids,
            };
        } catch (error) {
            console.error('Error fetching job with bids:', error);
            throw new Error('Failed to fetch job details');
        }
    }

    
}

// Export the main service instance
const jobManagementService = new JobManagementService();
export default jobManagementService;

// Export individual services for granular use
export { JobService, BiddingService };
