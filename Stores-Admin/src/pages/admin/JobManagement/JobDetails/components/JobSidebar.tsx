import { Bolt, Edit, Gavel, Trash2, UserPlus, DollarSign, Settings, Target, Users, Truck, User, UserMinus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Job } from '../../../../../types/job';
import JobMap from '../../../../../components/Provider/JobMap';
import ProviderProfileBox from '../../../../../components/admin/ProviderProfileBox';

interface JobSidebarProps {
    job: Job;
    onDeleteJob: (jobId: string) => void;
    onAssignProvider: (job: Job) => void;
    onUnassignProvider: (job: Job) => void;
    onMakeBiddable: (job: Job) => void;
    onMakeInstant: (job: Job) => void;
    onOverridePrice: (job: Job) => void;
    onOverrideStatus: (job: Job) => void;
    onMakeAvailable: (job: Job) => void;
    onMakeUnavailable: (job: Job) => void;
    onShowInterestedProviders: (job: Job) => void;
    onAssignDrivers: () => void;
    onAssignVehicles: () => void;
    onTabChange: (tab: string) => void;
    onRefresh: () => void;
    canBeMadeBiddable: boolean;
    canBeMadeInstant: boolean;
    makingAvailableJobId: string | null;
}

const JobSidebar: React.FC<JobSidebarProps> = ({
    job,
    onDeleteJob,
    onAssignProvider,
    onUnassignProvider,
    onMakeBiddable,
    onMakeInstant,
    onOverridePrice,
    onOverrideStatus,
    onMakeAvailable,
    onMakeUnavailable,
    onShowInterestedProviders,
    onAssignDrivers,
    onAssignVehicles,
    onTabChange,
    onRefresh,
    canBeMadeBiddable,
    canBeMadeInstant,
    makingAvailableJobId,
}) => {
    const navigate = useNavigate();
    console.log("the job", job)

    return (
        <div className="space-y-8">
            {/* Job Map */}
            <JobMap job={job} height="400px" />

            {/* Provider Profile Box - Only show when job is assigned */}
            {job.assigned_provider  && (
                <ProviderProfileBox job={job} onTabChange={onTabChange} onNavigate={navigate} onRefresh={onRefresh} />
            )}

            {/* Admin Action buttons */}
            <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/30 overflow-hidden">
                <div className="p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                        Admin Actions
                    </h2>

                    <div className="space-y-3">
                        {/* Make Biddable Button - Only show if job can be made biddable */}
                        {canBeMadeBiddable && (
                            <button
                                onClick={() => onMakeBiddable(job)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-purple-400/50"
                            >
                                <Gavel className="w-4 h-4" />
                                Make Biddable
                            </button>
                        )}

                        {/* Make Instant Button - Only show if job can be made instant */}
                        {canBeMadeInstant && (
                            <button
                                onClick={() => onMakeInstant(job)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-yellow-400/50"
                            >
                                <Bolt className="w-4 h-4" />
                                Make Instant
                            </button>
                        )}

                        {/* Make Available Button - Only show for draft jobs that are not available */}
                        {['draft', 'pending', 'bidding'].includes(job.status) && !job.available_to_providers && (
                            <button
                                onClick={() => onMakeAvailable(job)}
                                disabled={makingAvailableJobId === job.id}
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {makingAvailableJobId === job.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Target className="w-4 h-4" />
                                )}
                                Make Available to Providers {['bidding'].includes(job.status) ? 'for partners to bid' : ''}
                            </button>
                        )}

                        {/* Make Unavailable Button - Only show for jobs that are available to providers */}
                        {job.available_to_providers && (
                            <button
                                onClick={() => onMakeUnavailable(job)}
                                disabled={makingAvailableJobId === job.id}
                                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-red-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {makingAvailableJobId === job.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Target className="w-4 h-4" />
                                )}
                                Make Unavailable to Providers 
                            </button>
                        )}

                        {/* View Interested Providers Button - Only show when providers are interested */}
                        {job.available_to_providers && (job.interested_providers.length || 0) > 0 && (
                            <button
                                onClick={() => onShowInterestedProviders(job)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-purple-400/50"
                            >
                                <Users className="w-4 h-4" />
                                View Interested Providers ({job.interested_providers.length || 0})
                            </button>
                        )}

                        {/* Assign Drivers Button - Only show when job is assigned to provider */}
                        {job.assigned_provider && job.assigned_provider.length > 0 && (
                            <button
                                onClick={onAssignDrivers}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-blue-400/50"
                            >
                                <User className="w-4 h-4" />
                                {(job.request?.assigned_staffs?.length || 0) > 0 ? 'Manage Drivers' : 'Assign Drivers'}
                            </button>
                        )}

                        {/* Assign Vehicles Button - Only show when job is assigned to provider */}
                        {job.assigned_provider && job.assigned_provider.length > 0 && (
                            <button
                                onClick={onAssignVehicles}
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                         text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                         transition-all duration-200 border border-green-400/50"
                            >
                                <Truck className="w-4 h-4" />
                                {(job.request?.assigned_vehicles?.length || 0) > 0 ? 'Manage Vehicles' : 'Assign Vehicles'}
                            </button>
                        )}

                        {/* Assign Provider Button */}
                        <button
                            onClick={() => onAssignProvider(job)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                     text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                     transition-all duration-200 border border-green-400/50"
                        >
                            <UserPlus className="w-4 h-4" />
                            Assign Provider
                        </button>

                        {/* Override Price Button */}
                        <button
                            onClick={() => onOverridePrice(job)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 
                                     text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                     transition-all duration-200 border border-emerald-400/50"
                        >
                            <DollarSign className="w-4 h-4" />
                            Override Price
                        </button>

                        {/* Override Status Button */}
                        <button
                            onClick={() => onOverrideStatus(job)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 
                                     text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                     transition-all duration-200 border border-indigo-400/50"
                        >
                            <Settings className="w-4 h-4" />
                            Override Status
                        </button>

                        

                        {/* Delete Job Button */}
                        <button
                            onClick={() => onDeleteJob(job.id)}
                            className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                                     text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 
                                     transition-all duration-200 border border-red-400/50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Job
                        </button>

                        {/* Job Type Info */}
                        <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                                {job.is_instant ? 'Instant Job' : 'Auction Job'}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                {job.is_instant
                                    ? 'Instant assignment available'
                                    : 'Biddable job - providers can submit bids'}
                            </p>
                            {!job.is_instant && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-2">
                                    Bidding ends: {job.bidding_end_time ? new Date(job.bidding_end_time).toLocaleDateString() : 'N/A'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobSidebar; 