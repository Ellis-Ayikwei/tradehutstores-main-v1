import React from 'react';
import { Job } from '../../../../../types/job';

interface JobDetailsTabProps {
    job: Job;
}

const JobDetailsTab: React.FC<JobDetailsTabProps> = ({ job }) => {
    // Check if there's an accepted bid
    const acceptedBid = (job as any)?.accepted_bid || job.bids?.find((b: any) => b.status === 'accepted');
    const acceptedBidAmount = acceptedBid?.amount || (job as any)?.accepted_bid_price;
    const hasAcceptedBid = !!acceptedBid || !!acceptedBidAmount;

    return (
        <div className="space-y-8">
            {/* Core Job Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Job Information */}
                <div className="backdrop-blur-sm bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        Job Information
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Service Type:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{job.request?.service_type || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Request Type:</span>
                            <span className="text-slate-900 dark:text-white font-bold capitalize">{job.request?.request_type || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Priority:</span>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    (job.request as any)?.service_level === 'high'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        : (job.request as any)?.service_level === 'normal'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}
                            >
                                {((job.request as any)?.service_level?.toUpperCase() || 'NORMAL')}
                            </span>
                        </div>
                        {/* Show accepted bid price if available, otherwise show base price */}
                        {hasAcceptedBid ? (
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-400 font-medium">Accepted Bid Price:</span>
                                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">£{parseFloat(String(acceptedBidAmount || '0')).toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">Price:</span>
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">£{(job as any)?.price || 0}</span>
                            </div>
                        )}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">Final Price:</span>
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">£{(job.request as any)?.final_price || 0}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">This is what the client has paid for the job</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Distance:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{job.request?.estimated_distance || 0}km</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Insurance:</span>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    job.request?.insurance_required
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}
                            >
                                {job.request?.insurance_required ? 'REQUIRED' : 'NOT REQUIRED'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Customer Information */}
                <div className="backdrop-blur-sm bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Customer Details
                    </h3>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Name:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{job.request?.user?.first_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Phone:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{job.request?.user?.phone_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Email:</span>
                            <span className="text-slate-900 dark:text-white font-bold text-sm">{job.request?.user?.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Pickup Date:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{job.request?.preferred_pickup_date || 'TBD'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Pickup Time:</span>
                            <span className="text-slate-900 dark:text-white font-bold">{job.request?.preferred_pickup_time || 'TBD'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Description */}
            <div className="backdrop-blur-sm bg-slate-50/80 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    Job Description
                </h3>
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/30 dark:border-slate-700/30">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{job.request?.notes || 'No description provided.'}</p>
                </div>
                {job.request?.special_instructions && (
                    <div className="mt-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200/30 dark:border-blue-700/30">
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Special Instructions:</h4>
                        <p className="text-slate-700 dark:text-slate-300">{job.request.special_instructions}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobDetailsTab; 