import React from 'react';
import { 
  IconAlertCircle,
  IconBolt,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClockHour4,
  IconCurrencyDollar,
  IconEdit,
  IconEye,
  IconGavel,
  IconMapPin,
  IconPackage,
  IconTarget,
  IconTrash,
  IconTruck,
  IconUser,
  IconUserCheck,
  IconX,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

interface Job {
  id: string;
  requestId: string;
  title: string;
  description: string;
  customerName: string;
  assigned_provider: any;
  pickup_location: string;
  delivery_location: string;
  status: 'draft' | 'pending' | 'bidding' | 'accepted' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  is_instant: boolean;
  price: number | null;
  minimum_bid: number | null;
  bidding_end_time: string | null;
  preferred_vehicle_types: string[];
  required_qualifications: string[];
  notes: string;
  items: string;
  created_at: string;
  updated_at: string;
  time_remaining: number | null;
  bid_count: number;
  request: {
    tracking_number: string;
    items: any[];
    user?: {
      first_name: string;
      last_name: string;
    };
    stops?: any[];
  };
}

interface DraggableJobTableProps {
  jobs: Job[];
  selectedJobs: Job[];
  onSelectJob: (job: Job) => void;
  onSelectAll: () => void;
  selectAll: boolean;
  onDeleteJob: (jobId: string) => void;
  deletingJobId: string | null;
  onShowAssignProvider: (job: Job) => void;
  getStatusBadgeClass: (status: string) => string;
  getStatusIcon: (status: string) => any;
  formatDate: (date: string) => string;
  formatTimeRemaining: (seconds: number) => string;
}

const DraggableJobTable: React.FC<DraggableJobTableProps> = ({
  jobs,
  selectedJobs,
  onSelectJob,
  onSelectAll,
  selectAll,
  onDeleteJob,
  deletingJobId,
  onShowAssignProvider,
  getStatusBadgeClass,
  getStatusIcon,
  formatDate,
  formatTimeRemaining
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Details</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status & Type</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pricing</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timing</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {jobs?.length > 0 ? (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedJobs.some(selectedJob => selectedJob.id === job.id)}
                      onChange={() => onSelectJob(job)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{job.request.tracking_number}</span>
                        {job.is_instant && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400">
                            <IconBolt className="w-3 h-3" />
                            Instant
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-48">{job.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <IconCalendar className="w-3 h-3" />
                        {formatDate(job.created_at)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <IconPackage className="w-3 h-3" />
                        <span className="truncate max-w-32">{job.request?.items?.length || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <IconUser className="w-4 h-4 text-gray-400" />
                        {job.customerName}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <IconMapPin className="w-3 h-3 text-red-500" />
                        <span className="truncate max-w-40">{job.pickup_location}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <IconMapPin className="w-3 h-3 text-green-500" />
                        <span className="truncate max-w-40">{job.delivery_location}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {job.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {job.bid_count > 0 && (
                        <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <IconGavel className="w-3 h-3" />
                          {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {job.assigned_provider ? (
                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <IconTruck className="w-4 h-4 text-emerald-500" />
                          {job.assigned_provider?.company_name || 'Assigned Provider'}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <IconTruck className="w-4 h-4 text-gray-400" />
                          Not assigned
                          <button
                            className="px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                            onClick={() => onShowAssignProvider(job)}
                          >
                            Assign
                          </button>
                        </div>
                      )}
                      {job.preferred_vehicle_types?.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{job.preferred_vehicle_types.join(', ')}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {job.price ? (
                        <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">£{job.price}</div>
                      ) : job.minimum_bid ? (
                        <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <IconCurrencyDollar className="w-4 h-4" />
                          Min: £{job.minimum_bid}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Price TBD</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {job.bidding_end_time && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          <span className="font-medium">Bidding ends:</span>
                          <br />
                          {formatDate(job.bidding_end_time)}
                        </div>
                      )}
                      {job.time_remaining && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                          <IconClockHour4 className="w-3 h-3" />
                          {formatTimeRemaining(job.time_remaining)} left
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Link
                        to={`/admin/jobs/${job.id}`}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <IconEye className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => onDeleteJob(job.id)}
                        disabled={deletingJobId === job.id}
                        className={`p-2 rounded-lg transition-colors ${
                          deletingJobId === job.id
                            ? 'text-red-400 cursor-not-allowed bg-red-50'
                            : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                        }`}
                        title={deletingJobId === job.id ? "Deleting..." : "Delete Job"}
                      >
                        {deletingJobId === job.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <IconTrash className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <IconPackage className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">No jobs found</h3>
                      <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DraggableJobTable;


