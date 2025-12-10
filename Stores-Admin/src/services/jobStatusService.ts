import axiosInstance from './axiosInstance';

export interface JobStatusUpdate {
  status: string;
  reason: string;
  override: boolean;
}

export interface BulkJobStatusUpdate {
  job_ids: string[];
  status: string;
  reason: string;
  override: boolean;
}

export interface JobStatusHistory {
  id: string;
  status: string;
  reason: string;
  changed_by: string;
  changed_at: string;
  metadata?: any;
}

export const jobStatusService = {
  /**
   * Update a single job's status
   */
  async updateJobStatus(jobId: string, update: JobStatusUpdate) {
    try {
      const response = await axiosInstance.patch(`/jobs/${jobId}/update-status/`, update);
      return response.data;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  },

  /**
   * Update multiple jobs' status in bulk
   */
  async updateBulkJobStatus(update: BulkJobStatusUpdate) {
    try {
      const response = await axiosInstance.patch('/jobs/bulk_update_status/', update);
      return response.data;
    } catch (error) {
      console.error('Error updating bulk job status:', error);
      throw error;
    }
  },

  /**
   * Get job status history
   */
  async getJobStatusHistory(jobId: string) {
    try {
      const response = await axiosInstance.get(`/jobs/${jobId}/status-history/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching job status history:', error);
      throw error;
    }
  },

  /**
   * Get available status transitions for a job
   */
  async getAvailableTransitions(jobId: string) {
    try {
      const response = await axiosInstance.get(`/jobs/${jobId}/available-transitions/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching available transitions:', error);
      throw error;
    }
  },

  /**
   * Validate status transition
   */
  async validateTransition(jobId: string, newStatus: string) {
    try {
      const response = await axiosInstance.post(`/jobs/${jobId}/validate-transition/`, {
        new_status: newStatus
      });
      return response.data;
    } catch (error) {
      console.error('Error validating transition:', error);
      throw error;
    }
  },

  /**
   * Get job status statistics
   */
  async getStatusStatistics() {
    try {
      const response = await axiosInstance.get('/jobs/status-statistics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching status statistics:', error);
      throw error;
    }
  },

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: string, page = 1, limit = 50) {
    try {
      const response = await axiosInstance.get(`/jobs/by-status/${status}/`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching jobs by status:', error);
      throw error;
    }
  },

  /**
   * Get status transition rules
   */
  async getTransitionRules() {
    try {
      const response = await axiosInstance.get('/jobs/transition-rules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching transition rules:', error);
      throw error;
    }
  }
};

export default jobStatusService;
